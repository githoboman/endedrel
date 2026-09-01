import { ethers, network } from "hardhat";

/**
 * BULK seeder — piles rich, varied activity onto the deployed AgentRegistry so
 * the BOT testnet explorer shows a busy, functioning A2A marketplace.
 *
 * Produces, per run:
 *   - N worker agents registering across several categories
 *   - Many top-level hires (createJob → USDC escrow → completeJob)
 *   - Recursive A2A hires: a worker hires a sub-worker with parentJobId set
 *     (the flagship feature), the sub-job settles, then the parent settles
 *   - A couple of failed jobs (failJob → refund + reputation penalty) for realism
 *
 * Safe to run repeatedly — every run adds more agents/jobs/volume.
 *
 * Tunables (env, optional):
 *   SEED_AGENTS=6     number of worker agents to register this run
 *   SEED_ROUNDS=3     number of hire+complete rounds over the agent set
 */

const REGISTRY = process.env.AGENT_REGISTRY_ADDRESS!;
const USDC = process.env.USDC_ADDRESS!;
const N_AGENTS = Number(process.env.SEED_AGENTS || 6);
const N_ROUNDS = Number(process.env.SEED_ROUNDS || 3);

const CATALOG = [
  { base: "WeatherBot", endpoint: "https://endedrel.app/api/weather", price: 1_000n, category: "data" },
  { base: "Summarizer", endpoint: "https://endedrel.app/api/summarize", price: 3_000n, category: "nlp" },
  { base: "MathSolver", endpoint: "https://endedrel.app/api/math-solve", price: 5_000n, category: "compute" },
  { base: "SentimentAI", endpoint: "https://endedrel.app/api/sentiment", price: 2_000n, category: "nlp" },
  { base: "CodeExplainer", endpoint: "https://endedrel.app/api/code-explain", price: 4_000n, category: "dev" },
  { base: "DeepResearch", endpoint: "https://endedrel.app/api/agent/research", price: 10_000n, category: "research" },
  { base: "CodingAgent", endpoint: "https://endedrel.app/api/agent/code", price: 20_000n, category: "dev" },
  { base: "TranslateBot", endpoint: "https://endedrel.app/api/agent/translate", price: 5_000n, category: "nlp" },
];

async function main() {
  if (!REGISTRY || !USDC) throw new Error("Set AGENT_REGISTRY_ADDRESS and USDC_ADDRESS in contracts/.env");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const registry = await ethers.getContractAt("AgentRegistry", REGISTRY, deployer);
  const usdc = await ethers.getContractAt("MockUSDC", USDC, deployer);

  const before = await registry.getStats();
  console.log(`Network:   ${network.name}`);
  console.log(`Requester: ${deployer.address}`);
  console.log(`Before → agents:${before[0]} jobs:${before[1]} volume:${Number(before[2]) / 1e6} USDC\n`);

  // Requester tops up USDC + approval once.
  let tx = await usdc.mint(deployer.address, 100_000_000n); // 100 USDC headroom
  await tx.wait();
  tx = await usdc.approve(REGISTRY, ethers.MaxUint256);
  await tx.wait();
  console.log("Requester funded 100 USDC + approved registry.\n");

  // ── Register N worker agents (unique wallets), fund each a little gas ─────
  const workers: { wallet: any; def: (typeof CATALOG)[number] }[] = [];
  console.log(`── Registering ${N_AGENTS} agents ──`);
  for (let i = 0; i < N_AGENTS; i++) {
    const def = CATALOG[i % CATALOG.length];
    const wallet = ethers.Wallet.createRandom().connect(provider);
    const fund = await deployer.sendTransaction({ to: wallet.address, value: ethers.parseEther("0.05") });
    await fund.wait();
    const reg = registry.connect(wallet) as typeof registry;
    const name = `${def.base} #${Number(before[0]) + i + 1}`;
    const r = await reg.registerAgent(name, def.endpoint, def.price, def.category);
    await r.wait();
    workers.push({ wallet, def });
    console.log(`  ✓ ${name} (${def.category}, ${Number(def.price) / 1e6} USDC)`);
  }

  // ── Rounds of top-level hires + completions ──────────────────────────────
  console.log(`\n── ${N_ROUNDS} rounds of hire + complete ──`);
  for (let round = 0; round < N_ROUNDS; round++) {
    for (const w of workers) {
      const hire = await registry.createJob(w.wallet.address, w.def.category, 0n);
      const rcpt = await hire.wait();
      const jobId = await jobIdFrom(registry, rcpt);
      const wr = registry.connect(w.wallet) as typeof registry;
      const done = await wr.completeJob(jobId);
      await done.wait();
    }
    console.log(`  ✓ round ${round + 1}: ${workers.length} jobs hired + completed`);
  }

  // ── Recursive A2A hire (the flagship feature) ────────────────────────────
  // A "manager" worker hires a "sub" worker, passing its own job as parentJobId.
  if (workers.length >= 2) {
    console.log(`\n── Recursive A2A hire (parentJobId chain) ──`);
    const manager = workers[0];
    const sub = workers[1];

    // 1. Requester hires the manager → parent job.
    const hireMgr = await registry.createJob(manager.wallet.address, manager.def.category, 0n);
    const parentId = await jobIdFrom(registry, await hireMgr.wait());
    console.log(`  ✓ requester hired manager → parent job #${parentId}`);

    // 2. Manager needs USDC to pay the sub-worker; requester funds it, manager approves.
    let t = await usdc.transfer(manager.wallet.address, 50_000n);
    await t.wait();
    const mgrUsdc = usdc.connect(manager.wallet) as typeof usdc;
    t = await mgrUsdc.approve(REGISTRY, ethers.MaxUint256);
    await t.wait();

    // 3. Manager hires the sub-worker, tagging the parent job.
    const mgrReg = registry.connect(manager.wallet) as typeof registry;
    const hireSub = await mgrReg.createJob(sub.wallet.address, sub.def.category, parentId);
    const subId = await jobIdFrom(registry, await hireSub.wait());
    console.log(`  ✓ manager hired sub-worker → child job #${subId} (parent #${parentId})`);

    // 4. Sub completes, then manager completes the parent.
    const subReg = registry.connect(sub.wallet) as typeof registry;
    await (await subReg.completeJob(subId)).wait();
    await (await mgrReg.completeJob(parentId)).wait();
    console.log(`  ✓ child #${subId} settled, then parent #${parentId} settled`);
  }

  // ── One failed job for realism (refund + reputation penalty) ─────────────
  if (workers.length >= 1) {
    console.log(`\n── A failed job (refund + penalty) ──`);
    const w = workers[workers.length - 1];
    const hire = await registry.createJob(w.wallet.address, w.def.category, 0n);
    const jobId = await jobIdFrom(registry, await hire.wait());
    // Requester marks it failed → USDC refunded, worker reputation drops.
    await (await registry.failJob(jobId)).wait();
    console.log(`  ✓ job #${jobId} failed → requester refunded, worker penalized`);
  }

  const after = await registry.getStats();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`BULK SEED COMPLETE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  totalAgents: ${before[0]} → ${after[0]}`);
  console.log(`  totalJobs:   ${before[1]} → ${after[1]}`);
  console.log(`  totalVolume: ${Number(before[2]) / 1e6} → ${Number(after[2]) / 1e6} USDC`);
  const bal = await provider.getBalance(deployer.address);
  console.log(`  deployer gas left: ${ethers.formatEther(bal)} BOT`);
  console.log(`\n  Explorer (requester wallet): https://scan.botchain.ai/address/${deployer.address}`);
  console.log(`  Explorer (registry):         https://scan.botchain.ai/address/${REGISTRY}`);
}

async function jobIdFrom(registry: any, rcpt: any): Promise<bigint> {
  for (const log of rcpt.logs) {
    try {
      const parsed = registry.interface.parseLog(log);
      if (parsed && parsed.name === "JobCreated") return parsed.args.jobId as bigint;
    } catch {
      /* skip */
    }
  }
  return (await registry.nextJobId()) - 1n;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
