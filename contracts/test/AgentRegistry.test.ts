import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Exercises the full job lifecycle end-to-end on a local EVM node, using a
 * MockUSDC in place of BOT Chain USDC. Confirms AgentRegistry.sol deploys and its
 * escrow/reputation logic behaves correctly.
 */
describe("AgentRegistry", () => {
  const ESCROW_TIMEOUT = 25600; // ~24h @ BOT Chain 3.374s/block
  const PRICE = 1_000_000n;     // 1 USDC (6 decimals)

  async function deploy() {
    const [owner, requester, worker, other] = await ethers.getSigners();

    const USDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();

    const Registry = await ethers.getContractFactory("AgentRegistry");
    const registry = await Registry.deploy(await usdc.getAddress(), ESCROW_TIMEOUT);
    await registry.waitForDeployment();

    // Fund + approve the requester.
    await usdc.mint(requester.address, 100n * PRICE);
    await usdc.connect(requester).approve(await registry.getAddress(), 100n * PRICE);

    return { registry, usdc, owner, requester, worker, other };
  }

  it("deploys with correct config", async () => {
    const { registry, usdc } = await deploy();
    expect(await registry.settlementToken()).to.equal(await usdc.getAddress());
    expect(await registry.escrowTimeoutBlocks()).to.equal(ESCROW_TIMEOUT);
    expect(await registry.REPUTATION_INITIAL()).to.equal(5000n);
  });

  it("registers an agent and sets category leader", async () => {
    const { registry, worker } = await deploy();
    await registry.connect(worker).registerAgent("WeatherBot", "http://x/api/weather", PRICE, "data");
    const a = await registry.getAgent(worker.address);
    expect(a.name).to.equal("WeatherBot");
    expect(a.reputation).to.equal(5000n);
    expect(await registry.getCategoryLeader("data")).to.equal(worker.address);
  });

  it("runs create -> complete: escrow releases to worker, reputation rises", async () => {
    const { registry, usdc, requester, worker } = await deploy();
    await registry.connect(worker).registerAgent("WeatherBot", "http://x", PRICE, "data");

    await registry.connect(requester).createJob(worker.address, "data", 0);
    const jobId = 1;

    // Escrow held by the contract.
    expect(await usdc.balanceOf(await registry.getAddress())).to.equal(PRICE);

    await registry.connect(worker).completeJob(jobId);

    // Worker paid, escrow drained.
    expect(await usdc.balanceOf(worker.address)).to.equal(PRICE);
    expect(await usdc.balanceOf(await registry.getAddress())).to.equal(0n);

    const a = await registry.getAgent(worker.address);
    expect(a.reputation).to.equal(5050n);     // +50
    expect(a.jobsCompleted).to.equal(1n);
    expect(a.totalEarned).to.equal(PRICE);
  });

  it("runs create -> fail: refunds requester, penalizes worker", async () => {
    const { registry, usdc, requester, worker } = await deploy();
    await registry.connect(worker).registerAgent("Flaky", "http://x", PRICE, "data");
    const before = await usdc.balanceOf(requester.address);

    await registry.connect(requester).createJob(worker.address, "data", 0);
    await registry.connect(requester).failJob(1);

    expect(await usdc.balanceOf(requester.address)).to.equal(before); // refunded
    const a = await registry.getAgent(worker.address);
    expect(a.reputation).to.equal(4900n);     // -100
    expect(a.jobsFailed).to.equal(1n);
  });

  it("blocks self-hire", async () => {
    const { registry, worker } = await deploy();
    await registry.connect(worker).registerAgent("Self", "http://x", PRICE, "data");
    await expect(
      registry.connect(worker).createJob(worker.address, "data", 0)
    ).to.be.revertedWithCustomError(registry, "SelfHire");
  });

  it("computes dynamic price with reputation premium", async () => {
    const { registry, worker, owner } = await deploy();
    await registry.connect(worker).registerAgent("Pro", "http://x", PRICE, "data");
    await registry.connect(owner).govSetReputation(worker.address, 7000);
    // premium = price * (7000-5000) / 100000 = 1e6 * 2000/100000 = 20000
    expect(await registry.getDynamicPrice(worker.address)).to.equal(PRICE + 20000n);
  });
});
