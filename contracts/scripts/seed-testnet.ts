import { ethers, network } from "hardhat";

/**
 * Seeds real on-chain activity against the deployed AgentRegistry on BOT
 * testnet — the "wallet interactions" a reviewer wants to see on the explorer.
 *
 * Story it writes on-chain:
 *   1. Two worker agents register themselves (registerAgent).
 *   2. The deployer (acting as the user/requester) mints & approves test USDC.
 *   3. The deployer hires each worker (createJob → USDC escrowed).
 *   4. Each worker completes its job (completeJob → escrow released, reputation up).
 *
 * Env (from contracts/.env):
 *   DEPLOYER_PRIVATE_KEY   — funded with testnet BOT (pays gas, acts as requester)
 *   USDC_ADDRESS           — deployed MockUSDC
 *   AGENT_REGISTRY_ADDRESS — deployed AgentRegistry
 */

const REGISTRY = process.env.AGENT_REGISTRY_ADDRESS!;
const USDC = process.env.USDC_ADDRESS!;

async function main() {
  if (!REGISTRY || !USDC) {
    throw new Error("Set AGENT_REGISTRY_ADDRESS and USDC_ADDRESS in contracts/.env");
  }

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  console.log(`Network:  ${network.name}`);
  console.log(`Requester (deployer): ${deployer.address}`);

  const registry = await ethers.getContractAt("AgentRegistry", REGISTRY, deployer);
  const usdc = await ethers.getContractAt("MockUSDC", USDC, deployer);

  // ── Create two worker wallets and fund them a little BOT for gas ──────────
  const workerDefs = [
    { name: "Summarizer Pro", endpoint: "https://endedrel.app/api/summarize", price: 3_000n, category: "nlp" },
    { name: "SentimentAI", endpoint: "https://endedrel.app/api/sentiment", price: 2_000n, category: "nlp" },
  ]; // price in USDC base units (6 decimals): 3_000 = 0.003 USDC

  const workers = workerDefs.map(() => ethers.Wallet.createRandom().connect(provider));

  console.log(`\n── Funding worker wallets with gas ──`);
  for (let i = 0; i < workers.length; i++) {
    const tx = await deployer.sendTransaction({
      to: workers[i].address,
      value: ethers.parseEther("0.2"),
    });
    await tx.wait();
    console.log(`  Worker ${i + 1} ${workers[i].address} funded  (tx ${tx.hash})`);
  }

  // ── Workers register themselves ──────────────────────────────────────────
  console.log(`\n── Registering agents ──`);
  for (let i = 0; i < workers.length; i++) {
    const d = workerDefs[i];
    const reg = registry.connect(workers[i]) as typeof registry;
    const tx = await reg.registerAgent(d.name, d.endpoint, d.price, d.category);
    await tx.wait();
    console.log(`  Registered "${d.name}"  (tx ${tx.hash})`);
  }

  // ── Requester mints & approves test USDC ─────────────────────────────────
  console.log(`\n── Funding requester with test USDC ──`);
  let tx = await usdc.mint(deployer.address, 1_000_000n); // 1.0 USDC
  await tx.wait();
  console.log(`  Minted 1.0 USDC  (tx ${tx.hash})`);
  tx = await usdc.approve(REGISTRY, ethers.MaxUint256);
  await tx.wait();
  console.log(`  Approved registry  (tx ${tx.hash})`);

  // ── Hire each worker, then have them complete the job ────────────────────
  console.log(`\n── Hiring + completing jobs ──`);
  for (let i = 0; i < workers.length; i++) {
    const d = workerDefs[i];

    const hireTx = await registry.createJob(workers[i].address, d.category, 0n);
    const hireRcpt = await hireTx.wait();
    // Recover jobId from the JobCreated event.
    const jobId = await currentJobIdFromReceipt(registry, hireRcpt);
    console.log(`  Hired "${d.name}" → job #${jobId}  (tx ${hireTx.hash})`);

    const worker = registry.connect(workers[i]) as typeof registry;
    const doneTx = await worker.completeJob(jobId);
    await doneTx.wait();
    console.log(`  "${d.name}" completed job #${jobId}  (tx ${doneTx.hash})`);
  }

  // ── Print resulting marketplace state ────────────────────────────────────
  const [totalAgents, totalJobs, totalVolume] = await registry.getStats();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SEED COMPLETE — on-chain marketplace state`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  totalAgents: ${totalAgents}`);
  console.log(`  totalJobs:   ${totalJobs}`);
  console.log(`  totalVolume: ${Number(totalVolume) / 1e6} USDC`);
  console.log(`\nWallet interactions to show reviewers:`);
  console.log(`  Requester: https://scan.botchain.ai/address/${deployer.address}`);
  for (let i = 0; i < workers.length; i++) {
    console.log(`  Worker ${i + 1}:  https://scan.botchain.ai/address/${workers[i].address}`);
  }
  console.log(`  Registry:  https://scan.botchain.ai/address/${REGISTRY}`);
}

async function currentJobIdFromReceipt(registry: any, rcpt: any): Promise<bigint> {
  for (const log of rcpt.logs) {
    try {
      const parsed = registry.interface.parseLog(log);
      if (parsed && parsed.name === "JobCreated") return parsed.args.jobId as bigint;
    } catch {
      /* not our event */
    }
  }
  // Fallback: nextJobId - 1
  return (await registry.nextJobId()) - 1n;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
