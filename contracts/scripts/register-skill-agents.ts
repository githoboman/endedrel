import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Registers the 11 Endedrel skill agents on-chain as real, payable agents.
 *
 * The contract allows one registration per address, so each agent gets its own
 * deterministic worker wallet (derived from the deployer key + agent id). The
 * deployer funds each with a little BOT for gas. All keys trace back to the
 * operator, but each agent has a distinct on-chain identity — the same shape a
 * external dev's agent will have when onboarding later.
 *
 * Output: writes contracts/deployments/skill-agents.json mapping
 *   agentId -> { address, privateKey, price, category, endpoint }
 * so the backend can load worker keys and call completeJob after delivering.
 *
 * Env (contracts/.env):
 *   DEPLOYER_PRIVATE_KEY, AGENT_REGISTRY_ADDRESS
 */

// Mirror of backend/src/skill-agents.ts SKILL_AGENTS (id, price, category, endpoint).
const SKILL_AGENTS = [
  { id: "json-agent",      name: "JSON Architect",     endpoint: "/api/skill/json",          category: "dev",      priceUSDC: 0.002 },
  { id: "hash-agent",      name: "CryptoHash Engine",  endpoint: "/api/skill/hash",          category: "security", priceUSDC: 0.003 },
  { id: "unit-agent",      name: "UnitConverter Pro",  endpoint: "/api/skill/convert",       category: "compute",  priceUSDC: 0.001 },
  { id: "regex-agent",     name: "RegexMaster",        endpoint: "/api/skill/regex",         category: "dev",      priceUSDC: 0.003 },
  { id: "textstats-agent", name: "TextAnalytica",      endpoint: "/api/skill/text-stats",    category: "nlp",      priceUSDC: 0.002 },
  { id: "entropy-agent",   name: "PassGuard Auditor",  endpoint: "/api/skill/password",      category: "security", priceUSDC: 0.002 },
  { id: "idgen-agent",     name: "TokenForge",         endpoint: "/api/skill/generate-id",   category: "security", priceUSDC: 0.001 },
  { id: "color-agent",     name: "ChromaConvert",      endpoint: "/api/skill/color",         category: "design",   priceUSDC: 0.001 },
  { id: "base-agent",      name: "RadixShift",         endpoint: "/api/skill/base-convert",  category: "compute",  priceUSDC: 0.001 },
  { id: "time-agent",      name: "ChronoSync",         endpoint: "/api/skill/time",          category: "data",     priceUSDC: 0.001 },
  { id: "finance-agent",   name: "FinCalc Advisor",    endpoint: "/api/skill/finance",       category: "finance",  priceUSDC: 0.004 },
];

const USDC_DECIMALS = 6;
// BOT sent to each worker wallet so it can pay gas for its own registerAgent +
// later completeJob txs. On mainnet this is real money, so keep it lean: a
// completeJob costs ~0.0009 BOT, so 0.005 covers several settlements.
// Override with GAS_TOPUP env (e.g. GAS_TOPUP=0.005 on mainnet).
const GAS_TOPUP = process.env.GAS_TOPUP || "0.05";

async function main() {
  const registryAddr = process.env.AGENT_REGISTRY_ADDRESS;
  if (!registryAddr) throw new Error("AGENT_REGISTRY_ADDRESS unset in contracts/.env");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const registry = await ethers.getContractAt("AgentRegistry", registryAddr, deployer);

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Registry: ${registryAddr}\n`);

  // Derive a deterministic worker wallet per agent from a base entropy so re-runs
  // reproduce the same addresses (idempotent-ish; skips already-registered ones).
  const baseSeed = ethers.id(`endedrel-skill-agents:${registryAddr.toLowerCase()}`);

  const out: Record<string, any> = {};
  for (const agent of SKILL_AGENTS) {
    const priv = ethers.keccak256(ethers.toUtf8Bytes(baseSeed + agent.id));
    const wallet = new ethers.Wallet(priv, provider);
    const priceUnits = BigInt(Math.round(agent.priceUSDC * 10 ** USDC_DECIMALS));

    // Skip if this address is already a registered agent (idempotent re-run).
    const existing = await registry.getAgent(wallet.address);
    if (existing.exists) {
      console.log(`  = ${agent.name} already registered at ${wallet.address}`);
      out[agent.id] = { address: wallet.address, privateKey: priv, price: agent.priceUSDC, category: agent.category, endpoint: agent.endpoint };
      continue;
    }

    // Fund the worker wallet for gas if empty.
    const bal = await provider.getBalance(wallet.address);
    if (bal < ethers.parseEther("0.01")) {
      const fund = await deployer.sendTransaction({ to: wallet.address, value: ethers.parseEther(GAS_TOPUP) });
      await fund.wait();
    }

    // Register from the worker wallet itself (msg.sender becomes the agent).
    const reg = registry.connect(wallet) as typeof registry;
    const tx = await reg.registerAgent(agent.name, agent.endpoint, priceUnits, agent.category);
    await tx.wait();
    console.log(`  + ${agent.name.padEnd(18)} ${wallet.address}  (${agent.priceUSDC} USDC, ${agent.category})`);

    out[agent.id] = { address: wallet.address, privateKey: priv, price: agent.priceUSDC, category: agent.category, endpoint: agent.endpoint };
  }

  // Persist the mapping (contains private keys — gitignore this file).
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "skill-agents.json");
  fs.writeFileSync(outPath, JSON.stringify({ registry: registryAddr, network: network.name, agents: out }, null, 2));
  console.log(`\nWrote ${outPath} (contains worker private keys — gitignored).`);

  const stats = await registry.getStats();
  console.log(`\nRegistry now: agents=${stats[0]} jobs=${stats[1]} volume=${Number(stats[2]) / 1e6} USDC`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
