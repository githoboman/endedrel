import { ethers, network } from "hardhat";

/**
 * Deploys AgentRegistry to a GOAT network.
 *
 * Required env:
 *   USDC_ADDRESS         — ERC-20 settlement token (USDC) on the target network.
 *                          GOAT has not published this publicly at time of writing;
 *                          set it before deploying. Deployment aborts if unset.
 *   ESCROW_TIMEOUT_BLOCKS — blocks before a requester can reclaim escrow.
 *                          Tune to GOAT block time for ~24h (Stacks used 144).
 */
async function main() {
  const usdc = process.env.USDC_ADDRESS;
  const timeout = process.env.ESCROW_TIMEOUT_BLOCKS;

  if (!usdc || !/^0x[0-9a-fA-F]{40}$/.test(usdc)) {
    throw new Error(
      "USDC_ADDRESS is unset or not a valid address. " +
        "Set the GOAT USDC (or chosen settlement token) address in .env before deploying."
    );
  }
  if (!timeout) {
    throw new Error("ESCROW_TIMEOUT_BLOCKS is unset. Set it in .env (e.g. blocks ≈ 24h on GOAT).");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Network:   ${network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`USDC:      ${usdc}`);
  console.log(`Timeout:   ${timeout} blocks`);

  const Registry = await ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy(usdc, BigInt(timeout));
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`\nAgentRegistry deployed at: ${address}`);
  console.log(`Set AGENT_REGISTRY_ADDRESS=${address} in your backend .env`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
