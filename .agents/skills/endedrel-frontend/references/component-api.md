# Component API Reference

Quick reference for every component's props and exports.

---

## AgentChat
**File**: `components/AgentChat.tsx`
**Props**:
```typescript
{
  onNewPayments: (amount: number) => void;  // Called on each x402 payment
  onProtocolTrace: (log: any) => void;       // Called on each SSE event
}
```
**Internal state**: `query`, `messages[]`, `isProcessing`, `agentStatus`
**SSE events handled**: `step`, `thought`, `payment`, `a2a-hire`, `done`

---

## EconomyGraph
**File**: `components/EconomyGraph.tsx`
**Props**:
```typescript
{
  refreshTrigger?: number;  // Increment to force data re-fetch
}
```
**Polls**: `/api/payments` + `/api/registry` every 4 seconds
**Renders**: Canvas-based topology (user → manager → 8 workers)

---

## TransactionLog
**File**: `components/TransactionLog.tsx`
**Props**:
```typescript
{
  refreshTrigger?: number;
}
```
**Polls**: `/api/payments`

---

## ProtocolTrace
**File**: `components/ProtocolTrace.tsx`
**Props**:
```typescript
{
  traces: ProtocolTraceEntry[];
  hiringDecisions: HiringDecision[];
}
```

---

## ToolCatalog
**File**: `components/ToolCatalog.tsx`
**Props**: None
**Fetches**: `/api/registry`

---

## Navbar
**File**: `components/Navbar.tsx`
**Props**: None
**Polls**: `/health` every 15 seconds
**Renders**: Brand, nav links, mode badge, language switcher, theme toggle, wallet

---

## Footer
**File**: `components/Footer.tsx`
**Props**: None
**Static**: Product links, resource links, legal links

---

## ConnectWalletButton
**File**: `components/ConnectWalletButton.tsx`
**Props**: None
**Uses**: `authenticate()` from `lib/userSession.ts`

---

## WalletInfo
**File**: `components/WalletInfo.tsx`
**Props**: None
**Uses**: `getConnectedAddress()` from `lib/userSession.ts`

---

## ThemeToggle
**File**: `components/ThemeToggle.tsx`
**Props**: None
**Uses**: `useTheme()` from `next-themes`

---

## A2ATopology
**File**: `components/A2ATopology.tsx`
**Props**:
```typescript
{
  hires: SubAgentHire[];  // Array of recursive hiring events
}
```

---

## AgentIcons
**File**: `components/AgentIcons.tsx`
**Exports**:
```typescript
getAgentIcon(agentName: string): LucideIcon    // Returns icon component
getAgentColor(agentName: string): string        // Returns hex color
```

---

## Lib Exports

### `lib/format.ts`
```typescript
fmtCost(cost: number | string | null | undefined, unit?: string): string
// "0.003" → "0.003 USDC"
// "0.003 USDC" → "0.003 USDC" (no double-unit)
```

### `lib/LanguageContext.tsx`
```typescript
useI18n(): { language: Language; setLanguage: (lang: Language) => void; t: Translations }
```

### `lib/userSession.ts`
```typescript
botTestnet: Chain           // chainId 968
botMainnet: Chain           // chainId 677
activeChain: Chain          // Based on NEXT_PUBLIC_BOT_NETWORK
authenticate(): Promise<string | null>
getConnectedAddress(): Promise<string | null>
isWalletAvailable(): boolean
sign_out(): void
```
