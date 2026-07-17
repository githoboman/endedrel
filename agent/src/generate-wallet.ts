/**
 * Generate Wallet — Create a testnet Stacks keypair for the agent
 *
 * Run: npx tsx agent/src/generate-wallet.ts
 * Copy the output into your .env as AGENT_PRIVATE_KEY
 */

import { generateKeypair } from 'x402-stacks';

const wallet = generateKeypair('testnet');

console.log('');
console.log('================================================================');
console.log('  NEW STACKS TESTNET WALLET');
console.log('================================================================');
console.log(`  Address    : ${wallet.address}`);
console.log(`  Public Key : ${wallet.publicKey}`);
console.log(`  Private Key: ${wallet.privateKey}`);
console.log('================================================================');
console.log('');
console.log('  Add to your .env:');
console.log(`  AGENT_PRIVATE_KEY=${wallet.privateKey}`);
console.log('');
console.log('  Get testnet STX from:');
console.log('  https://faucet.stacks.co');
console.log('');
