import { ethers, network } from "hardhat";

/**
 * Sends testnet assets from the deployer wallet to a destination address:
 *   - most of the native BOT (keeps a gas reserve)
 *   - the full MockUSDC balance
 *
 * Env:
 *   TRANSFER_TO         — destination 0x address (required)
 *   USDC_ADDRESS        — MockUSDC token (from contracts/.env)
 *   BOT_GAS_RESERVE     — BOT to keep for gas (default "0.13")
 */
async function main() {
  const to = process.env.TRANSFER_TO;
  const usdcAddr = process.env.USDC_ADDRESS;
  const reserve = ethers.parseEther(process.env.BOT_GAS_RESERVE || "0.13");

  if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) throw new Error("Set TRANSFER_TO to a valid 0x address.");
  if (!usdcAddr || !/^0x[0-9a-fA-F]{40}$/.test(usdcAddr)) throw new Error("USDC_ADDRESS unset/invalid in .env.");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  console.log(`Network:  ${network.name}`);
  console.log(`From:     ${deployer.address}`);
  console.log(`To:       ${to}\n`);

  // ── 1. Transfer full MockUSDC balance ────────────────────────────────────
  const usdc = await ethers.getContractAt("MockUSDC", usdcAddr, deployer);
  const usdcBal: bigint = await usdc.balanceOf(deployer.address);
  console.log(`MockUSDC balance: ${Number(usdcBal) / 1e6} USDC`);
  if (usdcBal > 0n) {
    const tx = await usdc.transfer(to, usdcBal);
    await tx.wait();
    console.log(`  ✓ sent ${Number(usdcBal) / 1e6} USDC  (tx ${tx.hash})`);
  } else {
    console.log("  (nothing to send)");
  }

  // ── 2. Transfer native BOT, minus gas reserve and the gas for THIS tx ────
  const botBal = await provider.getBalance(deployer.address);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits("20", "gwei");
  const gasCost = 21000n * gasPrice; // simple value transfer
  const sendable = botBal - reserve - gasCost;
  console.log(`\nBOT balance: ${ethers.formatEther(botBal)}  | reserve: ${ethers.formatEther(reserve)}  | send: ${ethers.formatEther(sendable > 0n ? sendable : 0n)}`);

  if (sendable > 0n) {
    const tx = await deployer.sendTransaction({ to, value: sendable, gasLimit: 21000n, gasPrice });
    await tx.wait();
    console.log(`  ✓ sent ${ethers.formatEther(sendable)} BOT  (tx ${tx.hash})`);
  } else {
    console.log("  (insufficient BOT after reserve/gas)");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const destBot = await provider.getBalance(to);
  const destUsdc: bigint = await usdc.balanceOf(to);
  console.log(`\n${"=".repeat(56)}`);
  console.log(`TRANSFER COMPLETE`);
  console.log(`${"=".repeat(56)}`);
  console.log(`  Destination BOT:  ${ethers.formatEther(destBot)}`);
  console.log(`  Destination USDC: ${Number(destUsdc) / 1e6}`);
  console.log(`  Explorer: https://scan.botchain.ai/address/${to}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
