import { ethers, network } from "hardhat";

/**
 * BOT MAINNET deployment of AgentRegistry, wired to a REAL settlement token.
 *
 * Guardrails (mainnet uses real money — this script refuses to guess):
 *   - MUST run on the botMainnet network (chainId 677).
 *   - MUST be given SETTLEMENT_TOKEN (a real ERC-20). It will NOT deploy a mock.
 *   - Verifies the token has code and responds to decimals()/symbol() on-chain
 *     before constructing the registry (the token is baked in permanently).
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY   — wallet funded with mainnet BOT for gas.
 *   SETTLEMENT_TOKEN       — the real stablecoin ERC-20 address on BOT mainnet.
 *   ESCROW_TIMEOUT_BLOCKS  — defaults to 25600 (~24h @ ~3.374s/block).
 */

const ERC20_MIN_ABI = [
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const timeout = process.env.ESCROW_TIMEOUT_BLOCKS || "25600";
  const token = process.env.SETTLEMENT_TOKEN || "";

  // ── Guard 1: correct network ──────────────────────────────────────────────
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== 677) {
    throw new Error(`Refusing to run: expected BOT mainnet (chainId 677), got chainId ${net.chainId}. Use --network botMainnet.`);
  }

  // ── Guard 2: a real token address is mandatory (no mock on mainnet) ────────
  if (!/^0x[0-9a-fA-F]{40}$/.test(token)) {
    throw new Error("SETTLEMENT_TOKEN is required on mainnet and must be a valid 0x address (the real stablecoin). Refusing to deploy a mock.");
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:   ${network.name} (chainId ${net.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(balance)} BOT`);
  console.log(`Timeout:   ${timeout} blocks`);
  if (balance === 0n) throw new Error("Deployer balance is 0. Fund it with mainnet BOT for gas.");

  // ── Guard 3: verify the settlement token is a real ERC-20 on-chain ────────
  const code = await ethers.provider.getCode(token);
  if (code === "0x") throw new Error(`SETTLEMENT_TOKEN ${token} has NO CODE on mainnet. Aborting.`);
  const erc20 = new ethers.Contract(token, ERC20_MIN_ABI, ethers.provider);
  const [decimals, symbol, supply] = await Promise.all([
    erc20.decimals(), erc20.symbol(), erc20.totalSupply(),
  ]);
  console.log(`\nSettlement token verified:`);
  console.log(`  address:  ${token}`);
  console.log(`  symbol:   ${symbol}`);
  console.log(`  decimals: ${decimals}`);
  console.log(`  supply:   ${supply.toString()}`);
  if (Number(decimals) !== 6) {
    console.warn(`  ⚠️  decimals is ${decimals}, not 6 — prices in the app assume 6-decimal units. Verify before proceeding.`);
  }

  // ── Deploy AgentRegistry wired to the real token ──────────────────────────
  console.log(`\nDeploying AgentRegistry...`);
  const Registry = await ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy(token, BigInt(timeout));
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();

  console.log(`AgentRegistry deployed at: ${registryAddress}`);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`MAINNET DEPLOYMENT COMPLETE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`SETTLEMENT_TOKEN=${token}   (${symbol}, ${decimals} dec)`);
  console.log(`AGENT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`Deploy tx: https://scan.botchain.ai/tx/${deployTx?.hash}`);
  console.log(`Explorer:  https://scan.botchain.ai/address/${registryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
