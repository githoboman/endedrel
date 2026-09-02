'use client';

/**
 * On-chain payment layer — the user's wallet pays for each agent hire.
 *
 * Flow (per the deployed AgentRegistry, approve + transferFrom escrow):
 *   1. approveUsdcIfNeeded()  — one-time (infinite) USDC allowance to the registry.
 *   2. hireAgent()            — createJob(worker, category, 0) → escrows USDC,
 *                               returns the on-chain jobId + tx hash.
 * The backend (acting as the worker) later calls completeJob to release escrow.
 *
 * Uses viem over the injected wallet (MetaMask). Reads go through a public
 * client on the BOT RPC; writes go through a wallet client that prompts the user.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  maxUint256,
  decodeEventLog,
  type Address,
  type Hash,
} from 'viem';
import { activeChain, getProvider } from './userSession';

// ── Deployed contract addresses (BOT testnet) ──────────────────────────────
// Overridable via env for mainnet / redeploys.
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ||
  '0x5161ceF4b95EA0E95296FF3a6d7D6084072754f5') as Address;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0xF7bDE0378a68b278A515f1874D6101aB3ac3F8A0') as Address;
export const USDC_DECIMALS = 6;

// ── Minimal ABIs (only what this module calls) ─────────────────────────────
const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
] as const;

const REGISTRY_ABI = [
  { name: 'createJob', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'worker', type: 'address' },
      { name: 'category', type: 'string' },
      { name: 'parentJobId', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }] },
  { name: 'disputeJob', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }], outputs: [] },
  { name: 'getAgent', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'name', type: 'string' }, { name: 'endpoint', type: 'string' },
        { name: 'price', type: 'uint256' }, { name: 'category', type: 'string' },
        { name: 'reputation', type: 'uint256' }, { name: 'jobsCompleted', type: 'uint256' },
        { name: 'jobsFailed', type: 'uint256' }, { name: 'totalEarned', type: 'uint256' },
        { name: 'isActive', type: 'bool' }, { name: 'registeredAt', type: 'uint256' },
        { name: 'exists', type: 'bool' },
      ],
    }] },
  { type: 'event', name: 'JobCreated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'worker', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'parentJobId', type: 'uint256', indexed: false },
    ] },
] as const;

// ── Clients ─────────────────────────────────────────────────────────────────

function publicClient() {
  return createPublicClient({ chain: activeChain, transport: http() });
}

function walletClient() {
  const provider = getProvider();
  if (!provider) throw new Error('No wallet found. Install MetaMask to pay for agents.');
  return createWalletClient({ chain: activeChain, transport: custom(provider as any) });
}

// ── Reads ─────────────────────────────────────────────────────────────────

/** USDC balance of an address, in human units (e.g. 12.5). */
export async function getUsdcBalance(owner: Address): Promise<number> {
  const bal = await publicClient().readContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner],
  });
  return Number(bal) / 10 ** USDC_DECIMALS;
}

/** Current allowance the user has granted the registry, in human units. */
export async function getAllowance(owner: Address): Promise<number> {
  const a = await publicClient().readContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'allowance', args: [owner, REGISTRY_ADDRESS],
  });
  return Number(a) / 10 ** USDC_DECIMALS;
}

/** An agent's on-chain price (human units) — the exact amount that will be escrowed. */
export async function getAgentPrice(worker: Address): Promise<number> {
  const agent = await publicClient().readContract({
    address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'getAgent', args: [worker],
  }) as { price: bigint; exists: boolean };
  if (!agent.exists) throw new Error('That agent is not registered on-chain.');
  return Number(agent.price) / 10 ** USDC_DECIMALS;
}

// ── Writes (prompt the user) ────────────────────────────────────────────────

/**
 * Ensure the registry can pull USDC. If the current allowance already covers
 * `amountNeeded`, does nothing (no prompt). Otherwise sends ONE infinite-approve
 * tx the user signs, and waits for it to confirm.
 * Returns the approval tx hash, or null if no approval was needed.
 */
export async function approveUsdcIfNeeded(owner: Address, amountNeeded: number): Promise<Hash | null> {
  const current = await getAllowance(owner);
  if (current >= amountNeeded) return null;

  const wallet = walletClient();
  const hash = await wallet.writeContract({
    account: owner,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [REGISTRY_ADDRESS, maxUint256],
  });
  await publicClient().waitForTransactionReceipt({ hash });
  return hash;
}

export interface HireResult {
  jobId: bigint;
  txHash: Hash;
  amountUsdc: number;
  explorerUrl: string;
}

/**
 * Hire an agent: approve (if needed) then createJob, escrowing the agent's price.
 * Returns the on-chain jobId parsed from the JobCreated event + the tx hash.
 */
export async function hireAgent(params: {
  owner: Address;
  worker: Address;
  category: string;
  parentJobId?: bigint;
}): Promise<HireResult> {
  const { owner, worker, category, parentJobId = 0n } = params;

  const price = await getAgentPrice(worker);
  const balance = await getUsdcBalance(owner);
  if (balance < price) {
    throw new Error(`Insufficient USDC: need ${price}, have ${balance.toFixed(6)}.`);
  }

  await approveUsdcIfNeeded(owner, price);

  const wallet = walletClient();
  const txHash = await wallet.writeContract({
    account: owner,
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'createJob',
    args: [worker, category, parentJobId],
  });

  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });

  // Parse jobId from the JobCreated event.
  let jobId = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({ abi: REGISTRY_ABI, data: log.data, topics: log.topics });
      if (parsed.eventName === 'JobCreated') {
        jobId = (parsed.args as { jobId: bigint }).jobId;
        break;
      }
    } catch {
      /* not our event */
    }
  }

  return {
    jobId,
    txHash,
    amountUsdc: price,
    explorerUrl: `${activeChain.blockExplorers!.default.url}/tx/${txHash}`,
  };
}

/** User-initiated dispute if a worker never delivered (parks the escrow). */
export async function disputeJob(owner: Address, jobId: bigint): Promise<Hash> {
  const wallet = walletClient();
  const hash = await wallet.writeContract({
    account: owner,
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'disputeJob',
    args: [jobId],
  });
  await publicClient().waitForTransactionReceipt({ hash });
  return hash;
}
