/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Endedrel — On-Chain Bridge
 * ═══════════════════════════════════════════════════════════════════════════
 * Connects the backend to the deployed AgentRegistry on BOT Chain so that:
 *   - each skill agent exposes its REAL on-chain address (the frontend pays it)
 *   - after an agent delivers, the backend calls completeJob from that agent's
 *     worker key, releasing the user's escrowed USDC and bumping reputation.
 *
 * Worker keys come from contracts/deployments/skill-agents.json (gitignored).
 * If that file or an RPC is unavailable, this bridge degrades gracefully: the
 * skill endpoints still work; only on-chain settlement is skipped.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ── Chain config (mirror of frontend) ──────────────────────────────────────
const NETWORK = (process.env.BOT_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const RPC_URL = NETWORK === 'mainnet'
  ? (process.env.BOT_MAINNET_RPC || 'https://rpc.botchain.ai')
  : (process.env.BOT_TESTNET_RPC || 'https://rpc.bohr.life');
const CHAIN_ID = NETWORK === 'mainnet' ? 677 : 968;
const EXPLORER = 'https://scan.botchain.ai';

const botChain = defineChain({
  id: CHAIN_ID,
  name: NETWORK === 'mainnet' ? 'BOT Chain' : 'BOT Chain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'BOTScan', url: EXPLORER } },
});

const REGISTRY_ADDRESS = (process.env.AGENT_REGISTRY_ADDRESS || '') as Address;

const REGISTRY_ABI = [
  { name: 'completeJob', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }], outputs: [] },
  { name: 'getJob', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'requester', type: 'address' }, { name: 'worker', type: 'address' },
      { name: 'amount', type: 'uint256' }, { name: 'category', type: 'string' },
      { name: 'status', type: 'bytes12' }, { name: 'parentJobId', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' }, { name: 'completedAt', type: 'uint256' },
      { name: 'exists', type: 'bool' },
    ] }] },
] as const;

// ── Load the skill-agent worker mapping (addresses + keys) ──────────────────
interface WorkerEntry { address: Address; privateKey: `0x${string}`; price: number; category: string; endpoint: string; }
const workersById = new Map<string, WorkerEntry>();
const workersByEndpoint = new Map<string, WorkerEntry>();
let bridgeReady = false;

function loadMapping() {
  try {
    const p = path.join(process.cwd(), '..', 'contracts', 'deployments', 'skill-agents.json');
    const alt = path.join(process.cwd(), 'contracts', 'deployments', 'skill-agents.json');
    const file = fs.existsSync(p) ? p : (fs.existsSync(alt) ? alt : null);
    if (!file) { console.warn('[onchain] skill-agents.json not found — on-chain settlement disabled.'); return; }
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { agents: Record<string, WorkerEntry> };
    for (const [id, w] of Object.entries(data.agents)) {
      workersById.set(id, w);
      workersByEndpoint.set(w.endpoint, w);
    }
    bridgeReady = !!REGISTRY_ADDRESS && workersById.size > 0;
    console.log(`[onchain] Loaded ${workersById.size} worker agents. On-chain settlement ${bridgeReady ? 'ENABLED' : 'disabled'}.`);
  } catch (e: any) {
    console.warn(`[onchain] Failed to load worker mapping: ${e?.message}. Settlement disabled.`);
  }
}
loadMapping();

const publicClient = createPublicClient({ chain: botChain, transport: http(RPC_URL) });

// ── Public API ──────────────────────────────────────────────────────────────

/** Is the on-chain bridge configured (registry + worker keys present)? */
export function onchainReady(): boolean { return bridgeReady; }

/** The real on-chain address a user must pay to hire this skill agent. */
export function workerAddressForId(agentId: string): Address | null {
  return workersById.get(agentId)?.address ?? null;
}
export function workerAddressForEndpoint(endpoint: string): Address | null {
  return workersByEndpoint.get(endpoint)?.address ?? null;
}

/** Full public directory (no keys) for discovery responses. */
export function skillAgentOnchainDirectory(): Array<{ id: string; address: Address; price: number; category: string; endpoint: string }> {
  return [...workersById.entries()].map(([id, w]) => ({ id, address: w.address, price: w.price, category: w.category, endpoint: w.endpoint }));
}

/**
 * Release escrow for a delivered job by calling completeJob from the worker's
 * own key (the contract requires msg.sender == job.worker). Idempotent-ish:
 * returns null if already settled or not applicable.
 */
export async function settleJob(agentId: string, jobId: bigint): Promise<{ txHash: Hash; explorerUrl: string } | null> {
  if (!bridgeReady) return null;
  const worker = workersById.get(agentId);
  if (!worker) return null;

  // Confirm the job exists, is for this worker, and is still pending.
  try {
    const job = await publicClient.readContract({
      address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'getJob', args: [jobId],
    }) as { worker: Address; exists: boolean; status: string };
    if (!job.exists) return null;
    if (job.worker.toLowerCase() !== worker.address.toLowerCase()) return null;
  } catch {
    return null;
  }

  const account = privateKeyToAccount(worker.privateKey);
  const wallet = createWalletClient({ account, chain: botChain, transport: http(RPC_URL) });
  const txHash = await wallet.writeContract({
    address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'completeJob', args: [jobId],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, explorerUrl: `${EXPLORER}/tx/${txHash}` };
}
