import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Generates genuine economic activity on the MAINNET AgentRegistry:
 * for each round, the requester hires a registered agent (USDT into escrow)
 * and that agent completes the job (escrow released, reputation up).
 *
 * Every transaction is real: real USDT moves, real reputation accrues. The
 * loop is budget-aware and stops before the deployer runs out of gas rather
 * than dying mid-cycle and leaving an escrow stranded.
 *
 * Env: AGENT_REGISTRY_ADDRESS, SETTLEMENT_TOKEN, DEPLOYER_PRIVATE_KEY
 *      ROUNDS (optional, default 2) — passes over the agent list
 *      MIN_GAS_RESERVE (optional BOT, default 0.004) — stop threshold
 */

const REGISTRY = process.env.AGENT_REGISTRY_ADDRESS!;
const TOKEN = process.env.SETTLEMENT_TOKEN!;
const ROUNDS = Number(process.env.ROUNDS || 2);
const MIN_RESERVE = ethers.parseEther(process.env.MIN_GAS_RESERVE || "0.004");

const ERC20 = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const [requester] = await ethers.getSigners();
  const provider = ethers.provider;
  const registry = await ethers.getContractAt("AgentRegistry", REGISTRY, requester);
  const usdt = new ethers.Contract(TOKEN, ERC20, requester);

  // Worker keys written by register-skill-agents.ts (gitignored).
  const mapPath = path.join(__dirname, "..", "deployments", "skill-agents.json");
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8")) as {
    registry: string;
    agents: Record<string, { address: string; privateKey: string; price: number; category: string }>;
  };
  if (map.registry.toLowerCase() !== REGISTRY.toLowerCase()) {
    throw new Error(`skill-agents.json is for registry ${map.registry}, not ${REGISTRY}. Re-run register-skill-agents.`);
  }

  const before = await registry.getStats();
  console.log(`Network:   ${network.name}`);
  console.log(`Requester: ${requester.address}`);
  console.log(`USDT:      ${Number(await usdt.balanceOf(requester.address)) / 1e6}`);
  console.log(`BOT gas:   ${ethers.formatEther(await provider.getBalance(requester.address))}`);
  console.log(`Before →   agents:${before[0]} jobs:${before[1]} volume:${Number(before[2]) / 1e6} USDT\n`);

  // One-time approval so each hire doesn't need its own approve tx.
  const allowance: bigint = await usdt.allowance(requester.address, REGISTRY);
  if (allowance < ethers.parseUnits("1", 6)) {
    console.log("Approving registry to pull USDT…");
    await (await usdt.approve(REGISTRY, ethers.MaxUint256)).wait();
  }

  // Workers pay their own gas for completeJob (the contract requires the
  // worker to be msg.sender), so top up any that can't afford a settlement.
  // Without this the hire succeeds and the escrow is left stranded.
  const perSettlement = ethers.parseEther("0.0008");
  const workerFloor = perSettlement * BigInt(ROUNDS + 1);
  console.log(`Topping up worker gas (floor ${ethers.formatEther(workerFloor)} BOT each)…`);
  for (const [id, w] of Object.entries(map.agents)) {
    const bal = await provider.getBalance(w.address);
    if (bal < workerFloor) {
      const need = workerFloor - bal;
      try {
        await (await requester.sendTransaction({ to: w.address, value: need })).wait();
        console.log(`  + ${id.padEnd(17)} ${ethers.formatEther(need)} BOT`);
      } catch (e: any) {
        console.log(`  ! ${id}: top-up failed — ${(e?.shortMessage || e?.message || '').slice(0, 60)}`);
      }
    }
  }
  console.log();

  const entries = Object.entries(map.agents);
  let hires = 0, settled = 0;

  outer:
  for (let round = 0; round < ROUNDS; round++) {
    for (const [id, w] of entries) {
      // Stop before we strand an escrow with no gas left to settle it.
      const gas = await provider.getBalance(requester.address);
      if (gas < MIN_RESERVE) {
        console.log(`\n⚠ gas reserve reached (${ethers.formatEther(gas)} BOT) — stopping cleanly.`);
        break outer;
      }
      const bal: bigint = await usdt.balanceOf(requester.address);
      const price = ethers.parseUnits(String(w.price), 6);
      if (bal < price) {
        console.log(`\n⚠ USDT exhausted — stopping cleanly.`);
        break outer;
      }

      try {
        // 1. Hire: pulls `price` USDT into the contract's escrow.
        const hire = await registry.createJob(w.address, w.category, 0n);
        const rcpt = await hire.wait();
        let jobId = 0n;
        for (const log of rcpt!.logs) {
          try {
            const p = registry.interface.parseLog(log as any);
            if (p?.name === "JobCreated") jobId = p.args.jobId as bigint;
          } catch { /* not ours */ }
        }
        hires++;

        // 2. Settle: the worker itself calls completeJob (contract requires it).
        const worker = new ethers.Wallet(w.privateKey, provider);
        const asWorker = registry.connect(worker) as typeof registry;
        await (await asWorker.completeJob(jobId)).wait();
        settled++;

        console.log(`  ✓ job #${jobId}  ${id.padEnd(17)} ${w.price} USDT  settled`);
      } catch (e: any) {
        console.log(`  ✗ ${id}: ${(e?.shortMessage || e?.message || e).toString().slice(0, 90)}`);
      }
    }
  }

  const after = await registry.getStats();
  console.log(`\n${"=".repeat(58)}`);
  console.log(`MAINNET ACTIVITY COMPLETE`);
  console.log(`${"=".repeat(58)}`);
  console.log(`  hires: ${hires}   settled: ${settled}`);
  console.log(`  jobs:    ${before[1]} → ${after[1]}`);
  console.log(`  volume:  ${Number(before[2]) / 1e6} → ${Number(after[2]) / 1e6} USDT`);
  console.log(`  USDT left: ${Number(await usdt.balanceOf(requester.address)) / 1e6}`);
  console.log(`  BOT left:  ${ethers.formatEther(await provider.getBalance(requester.address))}`);
  console.log(`\n  https://scan.botchain.ai/address/${REGISTRY}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
