# Endedrel — Port to BOT Chain

Status of the port to BOT Chain (EVM, USDC, PoSA consensus).

## Done & verified

- **Contract**: `contracts/src/AgentRegistry.sol` — USDC escrow, EVM addresses, `block.number`. Compiles (solc 0.8.24).
- **Hardhat/BOT config**: Testnet Bohr (chainId **968**, `rpc.bohr.life`), Mainnet (chainId **677**, `rpc.botchain.ai`). Deploy script guards required env.
- **Backend payment layer**: `x402-stacks` `paymentMiddleware` replaced by BOT Chain x402 merchant client (`backend/src/bot-x402.ts`) — HMAC-SHA256 auth, `/api/v1/orders` create + poll to `PAYMENT_CONFIRMED`. Verified: server boots, paid routes gate, responses emit USDC.
- **Agent**: `agent.ts`, `test-client.ts`, `generate-wallet.ts` on viem/EVM. Wallet generator produces valid `0x` addresses.
- **Frontend**: Injected EVM wallet (viem), switched to BOT Chain. All STX/sBTC UI → USDC/BOT.
- **Denomination**: prices, API, all UI, in-app docs, README → USDC/BOT. All 3 packages type-check clean.
- **`x402-stacks` fully removed** from the project.
- **Explorer**: All links point to `https://scan.botchain.ai`

## Resolved caveats

- **Escrow timeout**: BOT Chain block time is ~3.374s. 24h ÷ 3.374s ≈ **25,600 blocks** → `ESCROW_TIMEOUT_BLOCKS=25600` in `.env.example`.
- **HMAC encoding** (hex vs base64): Defaulted to **hex** (convention for `X-Sign`). Override without code change: set `BOT_X402_SIGN_ENCODING=base64` if the first authenticated request 401s.

## What YOU need to supply for live settlement

### 1. BOT Chain merchant credentials

Refer to [dev-docs.botchain.ai](https://dev-docs.botchain.ai) for the merchant portal URL.

Drop into `backend/.env`, no code change:
- `BOT_X402_API_KEY`
- `BOT_X402_API_SECRET`
- `BOT_X402_MERCHANT_ID`

The portal also shows:
- Your **receiving address** → set `SERVER_ADDRESS`
- The **supported USDC token address** → set `USDC_ADDRESS`

Until API key + secret are set, the backend runs in **SIMULATION_MODE** (working demo, no real settlement).

### 2. GitHub & social links

- GitHub footer link set to `#` — set your real Endedrel repo URL in `frontend/src/components/Footer.tsx` when ready.

## First-real-request checklist (once you have credentials)

1. Fill `BOT_X402_API_KEY/SECRET/MERCHANT_ID`, `SERVER_ADDRESS`, `USDC_ADDRESS` in `backend/.env`.
2. Set `SIMULATION_MODE=false`.
3. Fund the agent wallet (`generate-wallet.ts`) with testnet USDC + tBOT gas.
4. Hit a paid endpoint. If it returns 401 → set `BOT_X402_SIGN_ENCODING=base64` and retry (confirms HMAC encoding).
5. Deploy the contract: set `DEPLOYER_PRIVATE_KEY`, `USDC_ADDRESS`, `ESCROW_TIMEOUT_BLOCKS=25600`, run `cd contracts && npm run deploy:botTestnet`.
