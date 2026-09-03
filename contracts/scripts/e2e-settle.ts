import { ethers } from "hardhat";

/**
 * End-to-end proof: a user hires a skill agent ON-CHAIN, calls the backend
 * skill endpoint with the jobId, and the backend releases escrow via
 * completeJob (from the worker's key). Verifies the agent's USDC rose.
 *
 * Prereq: backend running with the on-chain bridge enabled, e.g.
 *   AGENT_REGISTRY_ADDRESS=0x5161... BOT_NETWORK=testnet PORT=4055 \
 *   SIMULATION_MODE=true node --import tsx src/index.ts
 *
 * Env: BACKEND_URL (default http://127.0.0.1:4055)
 */

const REGISTRY = process.env.AGENT_REGISTRY_ADDRESS || "0x5161ceF4b95EA0E95296FF3a6d7D6084072754f5";
const USDC = process.env.USDC_ADDRESS || "0xF7bDE0378a68b278A515f1874D6101aB3ac3F8A0";
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:4055";
const AGENT = { id: "json-agent", endpoint: "/api/skill/json", address: "0x8D806F49cfd64B3f4972CFD7e5BcEA638CE1bff8", category: "dev" };

async function main() {
  const [user] = await ethers.getSigners();
  const registry = await ethers.getContractAt("AgentRegistry", REGISTRY, user);
  const usdc = await ethers.getContractAt("MockUSDC", USDC, user);

  console.log(`User (requester): ${user.address}`);
  console.log(`Hiring agent:     ${AGENT.id} @ ${AGENT.address}\n`);

  // Ensure the user has USDC + approval.
  await (await usdc.mint(user.address, 1_000_000n)).wait(); // 1 USDC
  await (await usdc.approve(REGISTRY, ethers.MaxUint256)).wait();

  const agentUsdcBefore = await usdc.balanceOf(AGENT.address);

  // 1. Hire on-chain → escrow the price → get jobId.
  const hire = await registry.createJob(AGENT.address, AGENT.category, 0n);
  const rcpt = await hire.wait();
  let jobId = 0n;
  for (const log of rcpt!.logs) {
    try { const p = registry.interface.parseLog(log as any); if (p?.name === "JobCreated") jobId = p.args.jobId; } catch {}
  }
  console.log(`1. createJob → jobId ${jobId} (USDC escrowed)`);

  // 2. Call the backend skill endpoint WITH the jobId.
  const resp = await fetch(`${BACKEND}${AGENT.endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: '{"hello":"world","n":42}', jobId: jobId.toString() }),
  });
  const body: any = await resp.json();
  console.log(`2. skill call → HTTP ${resp.status}, valid=${body.valid ?? body.ok ?? "?"}`);
  console.log(`   settlement: ${body.settlement ? body.settlement.txHash : "(none)"}`);

  // 3. Verify escrow was released to the agent.
  const job = await registry.getJob(jobId);
  const agentUsdcAfter = await usdc.balanceOf(AGENT.address);
  const statusStr = ethers.toUtf8String(job.status).replace(/\0/g, "");
  const delta = Number(agentUsdcAfter - agentUsdcBefore) / 1e6;

  console.log(`\n3. Verification`);
  console.log(`   job status:     ${statusStr}`);
  console.log(`   agent USDC +:   ${delta} USDC`);

  const ok = statusStr === "complete" && delta > 0 && !!body.settlement;
  console.log(`\n${ok ? "✅ E2E ON-CHAIN SETTLEMENT PASSED" : "❌ FAILED"}`);
  if (body.settlement) console.log(`   ${body.settlement.explorerUrl}`);
  if (!ok) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
