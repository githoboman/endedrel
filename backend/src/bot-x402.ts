/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BOT Chain x402 Merchant Client
 * ═══════════════════════════════════════════════════════════════════════════
 *  Talks to the x402 merchant gateway for BOT Chain payment settlement.
 *  BOT Chain does not use route-gating middleware — the server creates an order
 *  via the gateway and gates access on the order reaching PAYMENT_CONFIRMED.
 *
 *  Auth: HMAC-SHA256 over sorted request fields + api_key/timestamp/nonce.
 *  Credentials (X-API-Key + secret) come from the BOT merchant portal —
 *  set BOT_X402_API_KEY / BOT_X402_API_SECRET in .env. Without them the
 *  client cannot settle; callers should fall back to SIMULATION_MODE.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import * as crypto from 'node:crypto';
import axios from 'axios';

const NETWORK = (process.env.BOT_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const BASE_URL =
  process.env.BOT_X402_BASE_URL ||
  (NETWORK === 'mainnet'
    ? 'https://x402-api.botchain.ai'
    : 'https://x402-api-testnet.botchain.ai');

const CHAIN_ID = NETWORK === 'mainnet' ? 677 : 968;

const API_KEY = process.env.BOT_X402_API_KEY || '';
const API_SECRET = process.env.BOT_X402_API_SECRET || '';
// Merchant ID from the BOT merchant portal (per-environment). Optional field
// on the order body; included in the HMAC signature automatically when set.
const MERCHANT_ID = process.env.BOT_X402_MERCHANT_ID || '';

// The docs specify HMAC-SHA256 but not the output encoding. Hex is the
// convention for X-Sign headers, so it's the default. If the first real
// request 401s on auth, set BOT_X402_SIGN_ENCODING=base64 in .env — no code
// change needed.
const SIGN_ENCODING: 'hex' | 'base64' =
  process.env.BOT_X402_SIGN_ENCODING === 'base64' ? 'base64' : 'hex';

export function botCredentialsPresent(): boolean {
  return API_KEY.length > 0 && API_SECRET.length > 0;
}

/**
 * Build the HMAC-SHA256 signature exactly as the gateway specifies:
 *   include request fields + api_key/timestamp/nonce, drop empty values and
 *   `sign`, sort keys ASCII, join as k1=v1&k2=v2, HMAC-SHA256 with secret.
 */
function signRequest(
  fields: Record<string, string | number | undefined>,
  timestamp: string,
  nonce: string
): string {
  const all: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') continue;
    all[k] = String(v);
  }
  all['api_key'] = API_KEY;
  all['timestamp'] = timestamp;
  all['nonce'] = nonce;
  delete all['sign'];

  const canonical = Object.keys(all)
    .sort() // ASCII order
    .map((k) => `${k}=${all[k]}`)
    .join('&');

  return crypto.createHmac('sha256', API_SECRET).update(canonical).digest(SIGN_ENCODING);
}

function authHeaders(fields: Record<string, string | number | undefined>): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const sign = signRequest(fields, timestamp, nonce);
  return {
    'X-API-Key': API_KEY,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Sign': sign,
    'Content-Type': 'application/json',
  };
}

export interface CreateOrderParams {
  dappOrderId: string;      // our internal id
  fromAddress: string;      // payer (agent/user) EVM address
  amountWei: string;        // token amount in base units (USDC = 6 decimals)
  tokenSymbol?: string;     // default "USDC"
  tokenContract?: string;   // optional explicit token address
  callbackCalldata?: string;
}

export type OrderState =
  | 'CHECKOUT_VERIFIED'
  | 'PAYMENT_CONFIRMED'
  | 'INVOICED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface OrderResponse {
  order_id: string;
  state: OrderState;
  [k: string]: unknown;
}

/** Create a payment order on the BOT gateway. */
export async function createOrder(params: CreateOrderParams): Promise<OrderResponse> {
  const body = {
    dapp_order_id: params.dappOrderId,
    chain_id: CHAIN_ID,
    token_symbol: params.tokenSymbol || 'USDC',
    token_contract: params.tokenContract,
    from_address: params.fromAddress,
    amount_wei: params.amountWei,
    callback_calldata: params.callbackCalldata,
    // Optional; empty values are dropped by the signer before signing.
    merchant_id: MERCHANT_ID || undefined,
  };
  const res = await axios.post(`${BASE_URL}/api/v1/orders`, body, {
    headers: authHeaders(body),
    // 402 is the expected "payment required" response for order creation,
    // not an error — accept it so axios doesn't throw.
    validateStatus: (s) => (s >= 200 && s < 300) || s === 402,
  });
  return res.data as OrderResponse;
}

/** Query an order's current state. */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  const res = await axios.get(`${BASE_URL}/api/v1/orders/${orderId}`, {
    headers: authHeaders({ order_id: orderId }),
  });
  return res.data as OrderResponse;
}

/** Retrieve settlement proof for a confirmed order. */
export async function getProof(orderId: string): Promise<unknown> {
  const res = await axios.get(`${BASE_URL}/api/v1/orders/${orderId}/proof`, {
    headers: authHeaders({ order_id: orderId }),
  });
  return res.data;
}

/** Cancel an order. */
export async function cancelOrder(orderId: string): Promise<OrderResponse> {
  const res = await axios.post(
    `${BASE_URL}/api/v1/orders/${orderId}/cancel`,
    {},
    { headers: authHeaders({ order_id: orderId }) }
  );
  return res.data as OrderResponse;
}

/**
 * Poll an order until it reaches a terminal or confirmed state.
 * Returns the final order. Times out after `timeoutMs`.
 */
export async function waitForConfirmation(
  orderId: string,
  { timeoutMs = 30000, intervalMs = 2000 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<OrderResponse> {
  const deadline = Date.now() + timeoutMs;
  let last: OrderResponse | null = null;
  while (Date.now() < deadline) {
    last = await getOrder(orderId);
    if (
      last.state === 'PAYMENT_CONFIRMED' ||
      last.state === 'INVOICED' ||
      last.state === 'FAILED' ||
      last.state === 'EXPIRED' ||
      last.state === 'CANCELLED'
    ) {
      return last;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (last) return last;
  throw new Error(`Order ${orderId} status poll timed out`);
}

/** Explorer link for a settled tx on the active BOT network. */
export function botExplorerUrl(txHash: string): string {
  const base = 'https://scan.botchain.ai';
  return txHash ? `${base}/tx/${txHash}` : base;
}

export const botConfig = { BASE_URL, CHAIN_ID, NETWORK };
