# Endedrel — Stacks → GOAT Network Port

Status of the port from the original Stacks/Clarity build to GOAT Network (EVM, USDC).
Work is on the `goat-port` branch.

## Done & verified

- **Contract**: `contracts/agent-registry.clar` → `contracts/src/AgentRegistry.sol` (USDC escrow, EVM addresses, `block.number`). Compiles (solc 0.8.24). Original `.clar` kept as reference.
- **Hardhat/GOAT config**: testnet3 (chainId 48816, `rpc.testnet3.goat.network`), mainnet (2345, `rpc.goat.network`). Deploy script guards required env.
- **Backend payment layer**: `x402-stacks` `paymentMiddleware` replaced by GOAT x402 merchant client (`backend/src/goat-x402.ts`) — HMAC-SHA256 auth, `/api/v1/orders` create + poll to `PAYMENT_CONFIRMED`. Verified: server boots, paid routes gate, responses emit USDC.
- **Agent**: `agent.ts`, `test-client.ts`, `generate-wallet.ts` on viem/EVM. Wallet generator produces valid `0x` addresses.
- **Frontend**: Stacks wallet → injected EVM wallet (viem). Leaked private-key display removed. All STX/sBTC UI → USDC.
- **Denomination**: prices, API, all UI, in-app docs, README → USDC/GOAT. All 3 packages type-check clean.
- **`x402-stacks` fully removed** from the project.

## Resolved caveats

- **Escrow timeout**: GOAT testnet3 block time is ~3.374s (Blockscout `average_block_time: 3374.0` ms).
  24h ÷ 3.374s ≈ **25,600 blocks** → `ESCROW_TIMEOUT_BLOCKS=25600` in `.env.example`.
- **HMAC encoding** (hex vs base64): GOAT does not document it. Defaulted to **hex** (convention for `X-Sign`).
  Override without code change: set `GOAT_X402_SIGN_ENCODING=base64` if the first authenticated request 401s.

## What YOU need to supply for live settlement

### 1. GOAT merchant credentials (from the merchant portal)
- Testnet3 portal: https://x402-merchant-lx58aabp0r.testnet3.goat.network/merchants
- Mainnet portal: https://x402-merchant.goat.network/

The portal issues these — drop straight into `backend/.env`, no code change:
- `GOAT_X402_API_KEY`
- `GOAT_X402_API_SECRET`
- `GOAT_X402_MERCHANT_ID`

The portal also shows:
- Your **receiving address** → set `SERVER_ADDRESS`
- The **supported USDC token address** → set `USDC_ADDRESS`

Until API key + secret are set, the backend runs in **SIMULATION_MODE** (working demo, no real settlement).

### 2. Brand values — DONE (synergi fully removed)
All `synergi` references stripped from shipped code:
- API URL default → `http://localhost:4002` (override with `NEXT_PUBLIC_API_URL` in prod)
- localStorage keys → `endedrel_client_id`, `endedrel_lang`
- Dead support email + Twitter/Telegram social links removed
- Footer doc links repointed to GOAT (`docs.goat.network`, `x402.goat.network`)
- GitHub footer link set to `#` — set your real Endedrel repo URL in `frontend/src/components/Footer.tsx` when ready
Note: `contracts/agent-registry.clar` header still says "SYNERGI" — intentionally left as the original Stacks reference file (not shipped).

## First-real-request checklist (once you have credentials)

1. Fill `GOAT_X402_API_KEY/SECRET/MERCHANT_ID`, `SERVER_ADDRESS`, `USDC_ADDRESS` in `backend/.env`.
2. Set `SIMULATION_MODE=false`.
3. Fund the agent wallet (`generate-wallet.ts`) with testnet USDC + BTC gas.
4. Hit a paid endpoint. If it returns 401 → set `GOAT_X402_SIGN_ENCODING=base64` and retry (confirms encoding).
5. Deploy the contract: set `DEPLOYER_PRIVATE_KEY`, `USDC_ADDRESS`, `ESCROW_TIMEOUT_BLOCKS=25600`, run `cd contracts && npm run deploy:testnet`.
