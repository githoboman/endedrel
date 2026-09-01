---
name: endedrel-frontend
description: >-
  Comprehensive guide for developing the Endedrel Next.js 16 frontend.
  Use when creating, modifying, or debugging any file under frontend/src/ —
  including pages, components, styles, i18n, wallet integration, or
  backend API calls. Covers the design system (neumorphic glass), component
  patterns, routing, theming, internationalization, and the SSE-based
  real-time data flow.
---

# Endedrel Frontend Skill

> The Endedrel frontend is a **Next.js 16 + React 19** dashboard for the
> x402 Autonomous Agent Economy on BOT Network. It visualizes agent-to-agent
> hiring, USDC payments, protocol traces, and the live economy topology.

---

## 1. Technology Stack

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)             |
| UI               | React 19, vanilla CSS (no Tailwind)            |
| Animation        | framer-motion 12, Canvas API (EconomyGraph)    |
| Icons            | lucide-react 0.563                             |
| Wallet / Chain   | viem 2.48 (EIP-1193 injected provider)         |
| Theming          | next-themes (light / dark, class strategy)     |
| Internationalization | Custom context + dictionary (en, hi, es)   |
| Graph viz        | reactflow 11 (available), Canvas API (used)    |
| Deployment       | Vercel (vercel.json at frontend root)           |
| Dev server       | `cd frontend && npm run dev` (port 3000)       |

---

## 2. Project Structure

```
frontend/
├── next.config.ts            # Turbopack root resolver (monorepo vs Vercel)
├── vercel.json               # Vercel deploy config
├── tsconfig.json             # strict, bundler resolution, @/* alias → ./src/*
├── package.json
└── src/
    ├── app/
    │   ├── layout.tsx         # RootLayout — fonts, Navbar, Footer, Providers
    │   ├── Providers.tsx      # ThemeProvider + LanguageProvider
    │   ├── globals.css        # Full design system (neumorphic glass tokens)
    │   ├── page.tsx           # Landing page (Hero with stats ticker)
    │   ├── error.tsx          # Route-level error boundary
    │   ├── app/page.tsx       # /app — Main dashboard (EconomyGraph, AgentChat, TxnLog, ProtocolTrace, ToolCatalog)
    │   ├── agents/page.tsx    # /agents — Agent marketplace listing
    │   ├── tools/page.tsx     # /tools — Tool catalog page
    │   ├── docs/page.tsx      # /docs — Documentation page
    │   ├── license/           # /license
    │   ├── privacy/           # /privacy
    │   └── terms/             # /terms
    ├── components/
    │   ├── AgentChat.tsx      # Chat interface with SSE, hiring decisions, A2A topology
    │   ├── A2ATopology.tsx    # Inline agent hiring tree visualization
    │   ├── AgentIcons.tsx     # Agent icon/color mapping helpers
    │   ├── ConnectWalletButton.tsx  # EVM wallet connect (MetaMask etc.)
    │   ├── EconomyGraph.tsx   # Canvas-rendered live economy topology
    │   ├── ExecutionSteps.tsx # Execution step display
    │   ├── Footer.tsx         # Site-wide footer with link columns
    │   ├── HeroSection.tsx    # Hero section component
    │   ├── Navbar.tsx         # Sticky nav with mode badge, i18n, theme toggle
    │   ├── ProtocolTrace.tsx  # x402 protocol handshake viewer
    │   ├── ThemeToggle.tsx    # Light/dark mode toggle
    │   ├── ToolCatalog.tsx    # Worker agent tool listing
    │   ├── TransactionLog.tsx # USDC payment log with explorer links
    │   └── WalletInfo.tsx     # Connected wallet address display
    └── lib/
        ├── LanguageContext.tsx # React context for i18n (useI18n hook)
        ├── i18n.ts            # Translation dictionaries (en, hi, es)
        ├── format.ts          # fmtCost() — normalizes "0.003 USDC" display
        └── userSession.ts     # BOT Chain wallet session (viem, EIP-1193)
```

---

## 3. Design System — Neumorphic Glass

The **entire** design system is in `globals.css`. There is **no Tailwind**.

### 3.1 CSS Custom Properties (Tokens)

All colors, radii, shadows, and fonts are defined as CSS custom properties on
`:root` (light) and `.dark` (dark theme):

| Token Group        | Key Variables                                                           |
| ------------------ | ----------------------------------------------------------------------- |
| Backgrounds        | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`                       |
| Text               | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-inverse` |
| Accents            | `--accent-cyan`, `--accent-violet`, `--accent-500`, `--accent-hover`    |
| Semantic           | `--success`, `--warning`, `--error`, `--info`                           |
| Borders            | `--border-strong`, `--border-subtle`, `--border-width`                  |
| Radii              | `--radius-sm` (12px), `--radius-md` (20px), `--radius-lg` (32px)       |
| Neumorphic Shadows | `--shadow-neo`, `--shadow-neo-sm`, `--shadow-neo-inset`                 |
| Surfaces           | `--surface` (translucent), `--surface-solid`                            |
| Fonts              | `--font-sans` (Inter), `--font-mono` (JetBrains Mono)                  |
| Special            | `--btc` (#f59e0b — used for USDC/payment accent)                       |

### 3.2 Core CSS Classes

| Class              | Usage                                                    |
| ------------------ | -------------------------------------------------------- |
| `.neo-glass-panel` | Primary container — glass bg, blur, neumorphic shadow    |
| `.neo-header`      | Section header inside a panel — flex, border-bottom      |
| `.btn`             | Neumorphic button — raised, press-inset on `:active`     |
| `.btn-primary`     | Accent-colored button variant                            |
| `.badge`           | Inset-well pill badge                                    |
| `.badge-stx`       | Cyan-colored badge                                       |
| `.badge-a2a`       | Cyan-colored badge (same style)                          |
| `.mono`            | Monospace font family                                    |
| `.text-gradient`   | Cyan → violet gradient text                              |
| `.hero`            | Landing page hero section                                |
| `.hero-title`      | Hero heading (clamp responsive)                          |
| `.hero-lead`       | Hero lead paragraph                                      |
| `.hero-ticker`     | Stats grid inside hero                                   |
| `.hero-btn`        | CTA button in hero                                       |

### 3.3 Styling Rules

1. **Always use CSS variables** — never hardcode colors. Use `var(--token)`.
2. **Inline styles are the convention** — components use React `style={}` objects
   extensively (not CSS modules). Follow this pattern for consistency.
3. **Dark theme** is handled by `next-themes` via the `.dark` class on `<html>`.
   The CSS variables automatically switch. No manual dark-mode branching needed.
4. **Neumorphic raised effect**: Use `box-shadow: var(--shadow-neo)` for raised
   panels. Use `var(--shadow-neo-inset)` for pressed/inset elements.
5. **Glass effect**: `background: var(--surface)` + `backdrop-filter: blur(20px)`.
6. **Hover interactions**: Components use `onMouseEnter` / `onMouseLeave` with
   inline style mutations for hover effects (no CSS `:hover` in JSX).
7. **Animation class**: `.spin` is used for loading spinners (Loader2, Activity).
   Define `@keyframes spin` if adding new animations.

---

## 4. Component Architecture

### 4.1 Layout Chain

```
RootLayout (layout.tsx)
├── Providers.tsx          ← ThemeProvider + LanguageProvider
│   ├── Navbar             ← Sticky header, nav links, mode badge, wallet, i18n, theme toggle
│   ├── {children}         ← Page content
│   └── Footer             ← Site-wide footer
```

### 4.2 Key Component Patterns

**All components are client components** (`'use client'`). The project uses no
Server Components or Server Actions.

#### AgentChat (largest component — 784 lines)
- Maintains `messages[]` state, SSE connection to backend
- Renders sub-components: `SimpleMarkdown`, `SubAgentTree`, `HiringDecisionMessage`
- SSE events: `step`, `thought`, `payment`, `a2a-hire`, `done`
- Empty state shows example query chips in a 2-column grid
- Post-message state shows quick-access chip bar

#### EconomyGraph (Canvas-based)
- Uses `useRef<HTMLCanvasElement>` + `requestAnimationFrame` loop
- Renders nodes (user, manager, workers) with neumorphic circles
- Draws edges with glow effects for active payments
- Fetches from `/api/payments` and `/api/registry` every 4 seconds

#### Navbar
- Polls backend `/health` every 15 seconds for mode badge (live/simulation/offline)
- Language switcher (en/hi/es), ThemeToggle, WalletInfo, ConnectWalletButton
- Mobile hamburger menu with `@media (max-width: 768px)` via JSX `<style jsx>`

#### ProtocolTrace
- Displays raw x402 handshake data (HTTP status, headers, payment payload)
- Also shows hiring decisions with value scores

#### TransactionLog
- Polls `/api/payments` for USDC settlement history
- Shows explorer links, A2A depth indicators, flash swap metadata

---

## 5. Backend API Integration

The backend URL is resolved from `process.env.NEXT_PUBLIC_API_URL`, falling
back to `http://localhost:4002`. Always strip trailing slash:

```typescript
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');
```

### 5.1 REST Endpoints (used by frontend)

| Method | Endpoint              | Used By           | Returns                                    |
| ------ | --------------------- | ----------------- | ------------------------------------------ |
| POST   | `/api/agent/query`    | AgentChat         | `{ finalAnswer, ... }`                     |
| GET    | `/api/agent/events`   | AgentChat (SSE)   | SSE stream: step, thought, payment, done   |
| GET    | `/api/payments`       | TransactionLog, EconomyGraph | `{ payments[], count, a2aCount, totalVolume }` |
| GET    | `/api/registry`       | EconomyGraph, Agents page    | `{ agents[] }`                             |
| GET    | `/health`             | Navbar            | `{ BOTCredentials: bool, mode: string }`   |

### 5.2 SSE Event Types (AgentChat)

| Event      | Payload                                       | Action                         |
| ---------- | --------------------------------------------- | ------------------------------ |
| `step`     | `{ type, ... }`                               | Forward to ProtocolTrace       |
| `thought`  | `{ content, depth, subAgentHires }`           | Append assistant message       |
| `payment`  | `{ amount, agent, ... }`                      | Trigger payment counter        |
| `a2a-hire` | `{ hirer, worker, cost, depth }`              | Append system message          |
| `done`     | (none)                                        | Set idle state                 |

### 5.3 SSE Connection Pattern

- Uses `EventSource` with exponential backoff reconnect (max 5 attempts)
- Client ID stored in `localStorage` as `endedrel_client_id`
- On max reconnect failures, shows "Backend offline" system message

---

## 6. Internationalization (i18n)

### Adding a New Translation Key

1. Add the key + all 3 translations to `lib/i18n.ts` → `translations` object
   (under `en`, `hi`, `es`).
2. Use `const { t } = useI18n()` in any `'use client'` component.
3. Reference as `{t.yourNewKey}`.

### Adding a New Language

1. Add a new key to the `Language` type union in `lib/i18n.ts`.
2. Add the full translation object in `translations`.
3. Add the language button to `Navbar.tsx` (language switcher section).
4. Update `LanguageContext.tsx` to recognize the new language in localStorage.

---

## 7. Wallet Integration (BOT Chain)

Wallet integration lives in `lib/userSession.ts`. Key exports:

| Export                   | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `botTestnet`             | viem chain definition (chainId 968)               |
| `botMainnet`             | viem chain definition (chainId 677)               |
| `activeChain`            | Selected chain based on `NEXT_PUBLIC_BOT_NETWORK`  |
| `authenticate()`         | Prompt wallet connect + switch to BOT chain       |
| `getConnectedAddress()`  | Silent check for already-connected address         |
| `isWalletAvailable()`    | Check if injected provider exists                 |
| `sign_out()`             | Clear local cached address                        |

**No React context for wallet state** — components call these functions directly.

---

## 8. Common Workflows

### 8.1 Adding a New Page

1. Create `frontend/src/app/<route>/page.tsx`
2. Mark it `'use client'` (all pages in this project are client-rendered)
3. Wrap content in `neo-glass-panel` containers
4. Use `useI18n()` for any user-facing text
5. Add the route to `Navbar.tsx` → `navItems` array
6. Add the route to `Footer.tsx` → `productLinks` or `resourceLinks`

### 8.2 Adding a New Component

1. Create `frontend/src/components/YourComponent.tsx`
2. Mark it `'use client'`
3. Import icons from `lucide-react`
4. Use CSS variables for all colors: `var(--text-primary)`, `var(--accent-500)`, etc.
5. Use inline `style={}` objects (project convention, not CSS modules)
6. Use `var(--font-mono)` for monospace labels, `var(--font-sans)` for body
7. For hover effects, use `onMouseEnter`/`onMouseLeave` with style mutations

### 8.3 Adding a New Backend API Call

1. Use the `API` constant pattern:
   ```typescript
   const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');
   ```
2. Use `fetch()` directly (no axios in the frontend)
3. Wrap in try/catch with `.catch(() => fallbackValue)` pattern
4. For polling, use `useEffect` with `setInterval` + cleanup

### 8.4 Adding a New Worker Agent to the UI

1. Add to `WORKER_AGENTS` array in `EconomyGraph.tsx`
2. Add endpoint mapping to `agentIdFromEndpoint()` in `EconomyGraph.tsx`
3. Add icon mapping in `AgentIcons.tsx` (getAgentIcon / getAgentColor)
4. Add example query to `EXAMPLE_QUERIES` in `AgentChat.tsx`
5. Add to ToolCatalog if it should appear in the tools listing

---

## 9. Environment Variables (Frontend)

| Variable                   | Default              | Purpose                     |
| -------------------------- | -------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`      | `http://localhost:4002` | Backend API base URL      |
| `NEXT_PUBLIC_BOT_NETWORK`  | `testnet`            | `testnet` or `mainnet`      |

---

## 10. Running & Building

```bash
# Development
cd frontend && npm run dev     # Starts on port 3000, binds 0.0.0.0

# Production build
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

The `next.config.ts` auto-detects whether running in monorepo (hoisted deps)
or standalone (Vercel) mode and sets the Turbopack root accordingly.

---

## 11. Key Gotchas

1. **No Server Components** — every page/component is `'use client'`. Don't
   introduce server components without refactoring the provider chain.
2. **Inline styles everywhere** — this is intentional. Don't introduce CSS
   modules or styled-components; keep the existing pattern.
3. **SSE reconnect** — AgentChat has exponential backoff with max 5 retries.
   After that, it shows a system message and stops. If modifying SSE logic,
   preserve this behavior.
4. **fmtCost()** — always use `fmtCost()` from `lib/format.ts` to display
   costs. The backend is inconsistent (sends numbers and strings). This
   function normalizes to `"<n> USDC"`.
5. **LanguageContext** — only loads `'en'` and `'hi'` from localStorage
   (not `'es'`). If adding languages, update the check in `LanguageContext.tsx`.
6. **Canvas DPR** — `EconomyGraph.tsx` scales the canvas by `devicePixelRatio`.
   Always account for DPR when adding canvas rendering.
7. **JSX `<style jsx>`** — used only in `Navbar.tsx` for responsive media
   queries. This is a Next.js built-in feature (styled-jsx).
