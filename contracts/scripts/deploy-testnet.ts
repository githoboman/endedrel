import { ethers, network } from "hardhat";

/**
 * Full BOT testnet bring-up: deploys MockUSDC (test settlement token), then
 * AgentRegistry wired to it. Use this on testnet where there is no official
 * USDC. On mainnet, use scripts/deploy.ts with the real USDC_ADDRESS instead.
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY   — a wallet funded with testnet BOT for gas.
 *   ESCROW_TIMEOUT_BLOCKS  — e.g. 25600 (~24h @ 3.374s/block). Defaults to 25600.
 *
 * Optional:
 *   USDC_ADDRESS           — if set to a valid address, MockUSDC deploy is
 *                            skipped and AgentRegistry is wired to it.
 */
async function main() {
  const timeout = process.env.ESCROW_TIMEOUT_BLOCKS || "25600";
  const [deployer] = await ethers.getSigners();

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:   ${network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(balance)} BOT`);
  console.log(`Timeout:   ${timeout} blocks`);

  if (balance === 0n) {
    throw new Error(
      "Deployer balance is 0. Fund this address with testnet BOT from the " +
        "BOT Chain faucet (see dev-docs.botchain.ai) before deploying.",
    );
  }

  // 1. Settlement token: reuse an existing USDC_ADDRESS if provided, else deploy MockUSDC.
  let usdcAddress = process.env.USDC_ADDRESS;
  if (usdcAddress && /^0x[0-9a-fA-F]{40}$/.test(usdcAddress)) {
    console.log(`\nUsing existing USDC:      ${usdcAddress}`);
  } else {
    console.log(`\nDeploying MockUSDC (test settlement token)...`);
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log(`MockUSDC deployed at:     ${usdcAddress}`);
  }

  // 2. AgentRegistry, wired to the settlement token.
  console.log(`\nDeploying AgentRegistry...`);
  const Registry = await ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy(usdcAddress, BigInt(timeout));
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`AgentRegistry deployed at: ${registryAddress}`);

  // Summary block — copy these into your backend/.env and frontend env.
  console.log(`\n${"=".repeat(60)}`);
  console.log(`DEPLOYMENT COMPLETE — ${network.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`USDC_ADDRESS=${usdcAddress}`);
  console.log(`AGENT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`Explorer: https://scan.botchain.ai/address/${registryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
