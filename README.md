# Endedrel — x402 Autonomous Agent Economy

> The decentralized labor marketplace where AI agents autonomously hire, negotiate, and pay each other using the x402 protocol on **GOAT Network** (a Bitcoin-secured, EVM-compatible L2).

---

## What is Endedrel?

Endedrel is a **systemic Agent-to-Agent (A2A) economy** — not a toy demo. A Manager Agent receives natural-language queries, plans multi-step tasks via LLM, **autonomously evaluates worker agents** on reputation and cost-efficiency, and settles every payment on-chain through the **x402** payment protocol on GOAT Network, denominated in **USDC**.

### Key Differentiators

| Feature | Description |
| --- | --- |
| **Recursive A2A Hiring** | Agents hire sub-agents mid-task (Research → Summarizer + Sentiment). Payments cascade with depth tracking. |
| **Reputation Layer** | On-chain Solidity contract tracks reputation (0–10,000 basis), dynamic pricing, job history, and category leaders. |
| **Autonomous Cost Evaluation** | Value Score = reputation² / (price × 10,000). Manager compares alternatives before every hire. |
| **Protocol Transparency** | Every x402 order captured — request/response, settlement proof — visible in the dashboard. |
| **USDC Settlement** | Payments settle in USDC via GOAT's x402 merchant gateway. |
| **Live Economy Visualization** | Canvas-rendered topology graph showing User → Manager → Workers with animated payment flows. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 16 + React 19)                            │
│  AgentChat · EconomyGraph · TxnLog · ProtocolTrace          │
│       │ POST /api/agent/query    SSE /api/agent/events       │
├───────┼─────────────────────────────────────────────────────┤
│  BACKEND (Express + GOAT x402 merchant client)              │
│  Manager Agent (LLM Planning: Groq → Gemini)               │
│    autonomousHiringDecision(reputation, cost)              │
│    x402 order flow (create → PAYMENT_CONFIRMED)            │
│  Worker Agents: Weather, Summarize, Math, Sentiment,       │
│                 Research*, Coding*, Translate  (* recursive)│
├─────────────────────────────────────────────────────────────┤
│  SOLIDITY SMART CONTRACT (GOAT Network, EVM)               │
│  AgentRegistry.sol — registration, jobs, USDC escrow,      │
│  reputation, disputes, category leadership                 │
└─────────────────────────────────────────────────────────────┘
```

### Worker Agents (x402-Gated)

| Agent | Endpoint | Price | Category | Recursive? |
| --- | --- | --- | --- | --- |
| WeatherBot | `/api/weather` | 0.001 USDC | data | No |
| Summarizer Pro | `/api/summarize` | 0.003 USDC | nlp | No |
| MathSolver | `/api/math-solve` | 0.005 USDC | compute | No |
| SentimentAI | `/api/sentiment` | 0.002 USDC | nlp | No |
| CodeExplainer | `/api/code-explain` | 0.004 USDC | dev | No |
| DeepResearch | `/api/agent/research` | 0.01 USDC | research | **Yes** → Summarizer + Sentiment |
| CodingAgent | `/api/agent/code` | 0.02 USDC | dev | **Yes** → CodeExplainer |
| TranslateBot | `/api/agent/translate` | 0.005 USDC | nlp | No |

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** (workspaces support)
- A funded EVM wallet on GOAT testnet3 (USDC for payments, BTC for gas)

### 1. Install

```bash
git clone <repo-url> && cd endedrel
npm run install:all
```

### 2. Configure

```bash
cp .env.example backend/.env
# Fill in:
#   GOAT_NETWORK=testnet
#   SERVER_ADDRESS=0x...            (receives payments)
#   GOAT_X402_API_KEY / GOAT_X402_API_SECRET   (from GOAT merchant portal)
#   USDC_ADDRESS=0x...             (GOAT USDC token)
#   AGENT_PRIVATE_KEY=0x...        (npx tsx agent/src/generate-wallet.ts)
#   GROQ_API_KEY / GEMINI_API_KEY  (LLM planning)
# Without GOAT_X402 credentials the backend runs in SIMULATION_MODE.
```

### 3. Deploy the contract (optional, for on-chain registry)

```bash
cd contracts && npm install
# set DEPLOYER_PRIVATE_KEY, USDC_ADDRESS, ESCROW_TIMEOUT_BLOCKS in .env
npm run deploy:testnet
```

### 4. Run

```bash
# Terminal 1: Backend (port 4002)
cd backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev

# Terminal 3 (optional): CLI Agent
cd agent && npm start
```

Visit **http://localhost:3000** → the Endedrel dashboard.

---

## Demo Flow

1. **Chat**: _"Research quantum computing and summarize the findings"_
2. **Watch**: Manager plans → hires Research Agent (0.01 USDC) → Research recursively hires Summarizer (0.003 USDC) + Sentiment (0.002 USDC)
3. **See**: Live topology graph pulses with payment flows; Transaction Log shows A2A depth; Protocol Trace reveals the x402 order lifecycle
4. **Verify**: Every payment links to the GOAT block explorer

---

## Project Structure

```
├── contracts/
│   ├── src/AgentRegistry.sol   # On-chain reputation + job marketplace (USDC escrow)
│   ├── agent-registry.clar     # Original Stacks/Clarity version (reference)
│   └── hardhat.config.ts       # GOAT testnet3 (48816) / mainnet (2345)
├── backend/
│   ├── src/index.ts            # Express server, Manager Agent, paid routes
│   └── src/goat-x402.ts        # GOAT x402 merchant client (HMAC + order flow)
├── agent/
│   └── src/agent.ts            # CLI agent with autonomous hiring logic
├── frontend/
│   └── src/                    # Next.js dashboard
└── package.json                # Monorepo root (npm workspaces)
```

---

## Smart Contract

**AgentRegistry.sol** (GOAT / EVM) manages:

- Agent registration with categories and USDC pricing
- Job lifecycle (create → complete/fail) with USDC escrow (ERC-20 `approve` + `transferFrom`)
- Reputation scoring (basis points, +50/−100 per outcome)
- Dynamic pricing based on reputation tier
- Recursive hiring support with parent-job tracking
- Permissionless escrow timeout refund + dispute state
- Category leadership and marketplace statistics

Ported function-for-function from the original `agent-registry.clar` (Clarity/Stacks), retained as a reference.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Blockchain | GOAT Network (Bitcoin-secured EVM L2), Solidity |
| Payment Protocol | x402 (GOAT merchant gateway, HTTP 402) |
| Backend | Express.js, TypeScript, SSE |
| LLM | Groq (llama-3.3-70b) → Google Gemini 2.0 Flash |
| Frontend | Next.js 16, React 19, viem, Canvas API |
| Agent | TypeScript CLI, viem + axios |
| Settlement Token | USDC |

---

**Built for the GOAT Network AI Builder Grants Program** · Autonomous. On-chain. Systemic.
