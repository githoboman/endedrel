/**
 * Test Client — Manual verification that the backend endpoints work
 *
 * This script calls each paid endpoint using the x402 client wrapper.
 * It automatically handles 402 responses (sign tx → facilitator settles → access).
 *
 * Run: npx tsx agent/src/test-client.ts
 * Requires: AGENT_PRIVATE_KEY in .env and backend running on AGENT_SERVER_URL
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config({ path: '../.env' });
dotenv.config(); // also load local .env

// Payment settles server-side via the GOAT x402 order flow; the client just
// passes its payer address. Defensive parser for any payment-response header.
function decodePaymentResponse(raw: string): { transaction: string; payer?: string; network?: string } | null {
  if (!raw) return null;
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const tx = p.transaction || p.tx_hash || p.order_id;
    return tx ? { transaction: tx, payer: p.payer, network: p.network } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:4002';

if (!PRIVATE_KEY) {
  console.error(
    'AGENT_PRIVATE_KEY not set. Run: npx tsx src/generate-wallet.ts'
  );
  process.exit(1);
}

// Plain HTTP client; payment is settled server-side via GOAT x402 orders.
const account = privateKeyToAccount(
  (PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`) as `0x${string}`
);
const api = axios.create({
  baseURL: SERVER_URL,
  headers: { 'x-payer-address': account.address },
});

console.log('');
console.log('================================================================');
console.log('  x402 TEST CLIENT');
console.log('================================================================');
console.log(`  Server : ${SERVER_URL}`);
console.log(`  Payer  : ${account.address}`);
console.log('================================================================');
console.log('');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function printPaymentResponse(headers: Record<string, string>) {
  const paymentInfo = decodePaymentResponse(
    headers['payment-response'] || ''
  );
  if (paymentInfo) {
    console.log(`  Payment TX : ${paymentInfo.transaction}`);
    console.log(`  Payer      : ${paymentInfo.payer}`);
    console.log(`  Network    : ${paymentInfo.network}`);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testHealth() {
  console.log('[1/4] Testing /health (free)...');
  const res = await axios.get(`${SERVER_URL}/health`);
  console.log('  Status:', res.status);
  console.log('  Data:', JSON.stringify(res.data, null, 2));
  console.log('');
}

async function testWeather() {
  console.log('[2/4] Testing POST /api/weather (0.001 USDC)...');
  try {
    const res = await api.post('/api/weather', { city: 'Tokyo' });
    console.log('  Status:', res.status);
    console.log('  Data:', JSON.stringify(res.data, null, 2));
    printPaymentResponse(res.headers as Record<string, string>);
  } catch (err: any) {
    console.log('  Error:', err.response?.status, err.response?.data || err.message);
  }
  console.log('');
}

async function testSummarize() {
  console.log('[3/4] Testing POST /api/summarize (0.003 USDC)...');
  try {
    const res = await api.post('/api/summarize', {
      text: 'The x402 protocol enables automatic HTTP-level payments for APIs, AI agents, and digital services using USDC on GOAT Network. It works by returning a 402 Payment Required status when a client requests a protected resource. The client then signs a transaction and sends it via a facilitator, which broadcasts it to the blockchain. Once confirmed, the server grants access to the resource. This enables machine-to-machine micropayments without subscriptions or API keys.',
      maxLength: 100,
    });
    console.log('  Status:', res.status);
    console.log('  Data:', JSON.stringify(res.data, null, 2));
    printPaymentResponse(res.headers as Record<string, string>);
  } catch (err: any) {
    console.log('  Error:', err.response?.status, err.response?.data || err.message);
  }
  console.log('');
}

async function testMathSolve() {
  console.log('[4/4] Testing POST /api/math-solve (0.005 USDC)...');
  try {
    const res = await api.post('/api/math-solve', {
      expression: '(42 * 3) + (100 / 4) - 7',
    });
    console.log('  Status:', res.status);
    console.log('  Data:', JSON.stringify(res.data, null, 2));
    printPaymentResponse(res.headers as Record<string, string>);
  } catch (err: any) {
    console.log('  Error:', err.response?.status, err.response?.data || err.message);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  try {
    await testHealth();
    await testWeather();
    await testSummarize();
    await testMathSolve();

    console.log('================================================================');
    console.log('  All tests complete.');
    console.log('================================================================');
  } catch (err) {
    console.error('Test suite failed:', err);
    process.exit(1);
  }
}

main();
