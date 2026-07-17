# SYNERGI — x402 Autonomous Agent Economy

> **The first decentralized labor marketplace where AI agents autonomously hire, negotiate, and pay each other using the x402 protocol on Stacks/Bitcoin.

---

## What is SYNERGI?

SYNERGI is a **systemic Agent-to-Agent (A2A) economy** — not a toy demo. A Manager Agent receives natural-language queries, plans multi-step tasks via LLM, **autonomously evaluates worker agents** on reputation and cost-efficiency, and settles every payment on-chain through the **x402 HTTP 402** payment protocol on Stacks.

### Key Differentiators

| Feature                        | Description                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Recursive A2A Hiring**       | Agents hire sub-agents mid-task (Research → Summarizer + Sentiment). Payments cascade with depth tracking.        |
| **Reputation Layer**           | On-chain Clarity contract tracks reputation (0–10,000 basis), dynamic pricing, job history, and category leaders. |
| **Autonomous Cost Evaluation** | Value Score = reputation² / (price × 10,000). Manager compares alternatives before every hire.                    |
| **Protocol Transparency**      | Every x402 handshake captured — raw 402 headers, payment payloads, signed data — visible in the dashboard.        |
| **Dual Token Settlement**      | Pay in STX or sBTC (sats). Token preference cascades through the entire A2A chain.                                |
| **Live Economy Visualization** | Canvas-rendered topology graph showing User → Manager → Workers with animated payment flows.                      |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 16 + React 19)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │AgentChat │ │EconomyGr.│ │ TxnLog   │ │ProtocolTrace  │  │
│  └────┬─────┘ └──────────┘ └──────────┘ └───────────────┘  │
│       │ POST /api/agent/query    SSE /api/agent/events      │
├───────┼─────────────────────────────────────────────────────┤
│  BACKEND (Express + x402-stacks)                             │
│  ┌────▼────────────────────────────────────────────────┐    │
│  │  Manager Agent (LLM Planning: Groq → Gemini)       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ autonomousHiringDecision(reputation, cost)  │    │    │
│  │  └────────────────┬────────────────────────────┘    │    │
│  │                   │ x402 Payment (HTTP 402 → 200)   │    │
│  │  ┌────────┬───────┼───────┬────────┬───────────┐    │    │
│  │  │Weather │Summary│ Math  │Sentim. │ Research  │    │    │
│  │  │0.001STX│0.003  │0.005  │0.002   │ 0.01 STX │    │    │
│  │  └────────┴───────┴───────┴────────┤           │    │    │
│  │                                    │  ┌──────┐ │    │    │
│  │                         A2A Hire → │  │Summ. │ │    │    │
│  │                                    │  │Sent. │ │    │    │
│  │                                    └──┴──────┘ │    │    │
│  └─────────────────────────────────────────────────┘    │    │
├─────────────────────────────────────────────────────────┤    │
│  CLARITY SMART CONTRACT (Stacks Testnet)                │    │
│  agent-registry.clar — Registration, Jobs, Reputation   │    │
└─────────────────────────────────────────────────────────┘    │
```

### Worker Agents (x402-Gated)

| Agent          | Endpoint               | Price     | Category    | Recursive?                               |
| -------------- | ---------------------- | --------- | ----------- | ---------------------------------------- |
| WeatherBot     | `/api/weather`         | 0.001 STX | utility     | No                                       |
| Summarizer Pro | `/api/summarize`       | 0.003 STX | nlp         | No                                       |
| MathSolver     | `/api/math-solve`      | 0.005 STX | computation | No                                       |
| SentimentAI    | `/api/sentiment`       | 0.002 STX | nlp         | No                                       |
| CodeExplainer  | `/api/code-explain`    | 0.004 STX | development | No                                       |
| DeepResearch   | `/api/agent/research`  | 0.01 STX  | research    | **Yes** → hires Summarizer + Sentiment   |
| CodingAgent    | `/api/agent/code`      | 0.02 STX  | development | **Yes** → hires CodeExplainer for review |
| TranslateBot   | `/api/agent/translate` | 0.005 STX | nlp         | No                                       |

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** (workspaces support)
- Stacks testnet STX ([faucet](https://faucet.stacks.co))

### 1. Install

```bash
git clone <repo-url> && cd stacks-x402-challenge
npm run install:all
```

### 2. Configure

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your keys:
#   GROQ_API_KEY=gsk_...
#   AGENT_PRIVATE_KEY=<hex-private-key>
#   FACILITATOR_URL=https://x402-facilitator.onrender.com
```

### 3. Run

```bash
# Terminal 1: Backend (port 4002)
cd backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev

# Terminal 3 (optional): CLI Agent
cd agent && npm start
```

Visit **http://localhost:3000** → the SYNERGI dashboard.

---

## Demo Flow

1. **Chat**: Type _"Research quantum computing and summarize the findings"_
2. **Watch**: Manager plans → hires Research Agent (0.01 STX) → Research recursively hires Summarizer (0.003 STX) + Sentiment (0.002 STX)
3. **See**: Live topology graph pulses with payment flows, Transaction Log shows A2A depth, Protocol Trace reveals raw 402 headers
4. **Verify**: Every payment links to the Stacks Explorer

---

## Project Structure

```
├── contracts/
│   └── agent-registry.clar    # On-chain reputation + job marketplace
├── backend/
│   └── src/index.ts           # Express server, x402 middleware, Manager Agent
├── agent/
│   └── src/agent.ts           # CLI agent with autonomous hiring logic
├── frontend/
│   └── src/
│       ├── app/page.tsx       # Main dashboard
│       └── components/
│           ├── EconomyGraph.tsx    # Live canvas topology
│           ├── AgentChat.tsx       # Chat + SSE execution steps
│           ├── TransactionLog.tsx  # Payment log with A2A badges
│           ├── ToolCatalog.tsx     # Agent marketplace cards
│           ├── ProtocolTrace.tsx   # x402 header transparency
│           ├── ExecutionSteps.tsx  # Step-by-step execution
│           └── WalletInfo.tsx      # Wallet/network status
└── package.json               # Monorepo root (npm workspaces)
```

---

## Smart Contract

The **agent-registry.clar** Clarity contract manages:

- Agent registration with categories and pricing
- Job lifecycle (create → complete/fail) with STX escrow
- Reputation scoring (basis points, +50/-100 per outcome)
- Dynamic pricing based on reputation tier
- Recursive hiring support with parent-job tracking
- Category leadership and marketplace statistics

---

## Tech Stack

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Blockchain       | Stacks (Bitcoin L2), Clarity                   |
| Payment Protocol | x402-stacks (HTTP 402 micropayments)           |
| Backend          | Express.js, TypeScript, SSE                    |
| LLM              | Groq (llama-3.3-70b) → Google Gemini 2.0 Flash |
| Frontend         | Next.js 16, React 19, Canvas API               |
| Agent            | TypeScript CLI, Axios + x402 wrapper           |
| Tokens           | STX, sBTC (SIP-010)                            |

---

**Built for the x402 Stacks Hackathon 2026** · Autonomous. On-chain. Systemic.
