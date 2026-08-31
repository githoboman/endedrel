/**
 * Generate Wallet — Create an EVM keypair for the agent on BOT Chain.
 *
 * Run: npx tsx agent/src/generate-wallet.ts
 * Copy the output into your .env as AGENT_PRIVATE_KEY
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('');
console.log('================================================================');
console.log('  NEW BOT CHAIN (EVM) WALLET');
console.log('================================================================');
console.log(`  Address     : ${account.address}`);
console.log(`  Private Key : ${privateKey}`);
console.log('================================================================');
console.log('');
console.log('  Add to your .env:');
console.log(`  AGENT_PRIVATE_KEY=${privateKey}`);
console.log('');
console.log('  Fund it with BOT testnet tBOT (gas) and USDC (payments)');
console.log('  via the BOT Chain faucet. Network details:');
console.log('  https://dev-docs.botchain.ai/docs/intro');
console.log('');
