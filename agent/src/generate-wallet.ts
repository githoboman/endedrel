/**
 * Generate Wallet — Create an EVM keypair for the agent on GOAT Network.
 *
 * Run: npx tsx agent/src/generate-wallet.ts
 * Copy the output into your .env as AGENT_PRIVATE_KEY
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('');
console.log('================================================================');
console.log('  NEW GOAT NETWORK (EVM) WALLET');
console.log('================================================================');
console.log(`  Address     : ${account.address}`);
console.log(`  Private Key : ${privateKey}`);
console.log('================================================================');
console.log('');
console.log('  Add to your .env:');
console.log(`  AGENT_PRIVATE_KEY=${privateKey}`);
console.log('');
console.log('  Fund it with GOAT testnet BTC (gas) and USDC (payments)');
console.log('  via the GOAT testnet faucet / bridge. Network details:');
console.log('  https://docs.goat.network/docs/build/networks-rpc');
console.log('');
