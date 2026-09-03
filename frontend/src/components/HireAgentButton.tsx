'use client';

/**
 * HireAgentButton — the real user hire flow, from the browser.
 *
 *   click → MetaMask approve+createJob (escrow USDC) → call the agent's skill
 *   endpoint with the on-chain jobId → backend delivers + releases escrow
 *   (completeJob) → show the result and the settlement tx.
 *
 * Degrades clearly: if the agent has no on-chain address, or no wallet is
 * present, the button explains why instead of failing silently.
 */

import React, { useState } from 'react';
import { hireAgent } from '@/lib/payments';
import {
  authenticate, getConnectedAddress, isWalletAvailable, SETTLEMENT_SYMBOL,
} from '@/lib/userSession';
import type { Address } from 'viem';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');

type Phase = 'idle' | 'hiring' | 'working' | 'done' | 'error';

// Minimal per-agent default input so the demo works with one click. Real UIs
// would collect these fields; we send a sensible sample keyed by endpoint.
function sampleInput(endpoint: string): Record<string, unknown> {
  switch (endpoint) {
    case '/api/skill/json': return { json: '{"hello":"world","items":[1,2,3]}' };
    case '/api/skill/hash': return { text: 'endedrel', algorithm: 'sha256' };
    case '/api/skill/convert': return { value: 100, from: 'km', to: 'mi' };
    case '/api/skill/regex': return { pattern: '\\d+', text: 'order 42 shipped 2026', flags: 'g' };
    case '/api/skill/text-stats': return { text: 'The quick brown fox jumps over the lazy dog.' };
    case '/api/skill/password': return { password: 'Tr0ub4dour&3' };
    case '/api/skill/generate-id': return { count: 3 };
    case '/api/skill/color': return { color: '#4b32c3' };
    case '/api/skill/base-convert': return { value: 'ff', fromBase: 16 };
    case '/api/skill/time': return { timestamp: Date.now() };
    case '/api/skill/finance': return { principal: 10000, annualRatePct: 5, years: 10 };
    default: return {};
  }
}

export default function HireAgentButton({
  agentId, name, endpoint, onchainAddress, category, price,
}: {
  agentId: string;
  name: string;
  endpoint?: string;
  onchainAddress?: string | null;
  category: string;
  price: number;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [settlementUrl, setSettlementUrl] = useState<string | null>(null);

  const hireable = !!onchainAddress && !!endpoint;

  async function onHire(e: React.MouseEvent) {
    e.stopPropagation();
    setResult(null); setSettlementUrl(null);

    if (!isWalletAvailable()) { setPhase('error'); setMsg('Install MetaMask to hire agents.'); return; }
    if (!hireable) { setPhase('error'); setMsg('This agent is not yet available on-chain.'); return; }

    try {
      // 1. Ensure a connected wallet.
      let owner = (await getConnectedAddress()) as Address | null;
      if (!owner) owner = (await authenticate()) as Address | null;
      if (!owner) { setPhase('error'); setMsg('Wallet connection was declined.'); return; }

      // 2. On-chain hire — MetaMask prompts for approve (first time) + createJob.
      setPhase('hiring'); setMsg('Confirm the hire in your wallet…');
      const hire = await hireAgent({ owner, worker: onchainAddress as Address, category });

      // 3. Call the agent's skill endpoint with the confirmed jobId.
      setPhase('working'); setMsg(`Job #${hire.jobId} escrowed — agent is working…`);
      const resp = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...sampleInput(endpoint!), jobId: hire.jobId.toString() }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || `Agent returned HTTP ${resp.status}`);

      setResult(body);
      setSettlementUrl(body?.settlement?.explorerUrl || hire.explorerUrl);
      setPhase('done');
      setMsg(`Paid ${hire.amountUsdc} ${SETTLEMENT_SYMBOL} · escrow released to ${name}`);
    } catch (err: any) {
      setPhase('error');
      setMsg(friendlyError(err));
    }
  }

  const busy = phase === 'hiring' || phase === 'working';
  const label =
    phase === 'hiring' ? 'Confirm in wallet…' :
    phase === 'working' ? `${name} is working…` :
    phase === 'done' ? 'Hire again' :
    phase === 'error' ? 'Try again' :
    hireable ? `Hire · ${price} ${SETTLEMENT_SYMBOL}` : 'Off-chain';

  const statusTone =
    phase === 'error' ? 'is-error' : phase === 'done' ? 'is-done' : 'is-busy';

  return (
    <div className="hire">
      <button
        onClick={onHire}
        disabled={busy || !hireable}
        className={`hire-btn${busy ? ' is-busy' : ''}${!hireable ? ' is-disabled' : ''}`}
        aria-busy={busy}
        title={hireable ? `Pay ${price} ${SETTLEMENT_SYMBOL} to hire ${name}` : 'Not available on-chain yet'}
      >
        {busy && <span className="hire-spinner" aria-hidden="true" />}
        <span>{label}</span>
      </button>

      {/* Cost transparency: never let a payment be a surprise. */}
      {hireable && phase === 'idle' && (
        <p className="hire-hint">
          Escrowed on-chain · released only when {name} delivers
        </p>
      )}

      {/* Progress: name the actual step so a pending wallet popup is explicable. */}
      {busy && (
        <ol className="hire-steps" aria-label="Hire progress">
          <li className={phase === 'hiring' ? 'is-active' : 'is-complete'}>Approve &amp; escrow</li>
          <li className={phase === 'working' ? 'is-active' : ''}>Agent works</li>
          <li>Escrow released</li>
        </ol>
      )}

      {phase !== 'idle' && (
        <div className={`hire-status ${statusTone}`} role="status" aria-live="polite">
          <span className="hire-status-msg">{msg}</span>
          {settlementUrl && (
            <a className="hire-link" href={settlementUrl} target="_blank" rel="noopener noreferrer">
              View transaction ↗
            </a>
          )}
          {phase === 'done' && result && <ResultView data={result} />}
        </div>
      )}
    </div>
  );
}

// Trim the envelope fields so the preview shows the actual skill output.
function stripNoise(r: any) {
  if (!r || typeof r !== 'object') return r;
  const { source, agentId, onchainAddress, settlement, payment, ...rest } = r;
  return rest;
}

/**
 * Turn wallet/RPC exceptions into something a person can act on. Cancelling is
 * a normal choice, not a failure, so it must not read like an error.
 */
function friendlyError(err: any): string {
  const raw = String(err?.shortMessage || err?.message || err || '');
  if (/User rejected|denied transaction|User denied/i.test(raw)) {
    return 'Cancelled — no funds were moved.';
  }
  if (/insufficient funds/i.test(raw)) {
    return `Not enough ${SETTLEMENT_SYMBOL} or BOT for gas in your wallet.`;
  }
  if (/chain|network/i.test(raw) && /mismatch|unsupported|switch/i.test(raw)) {
    return 'Wrong network — switch your wallet to BOT Chain.';
  }
  if (/not registered on-chain/i.test(raw)) {
    return 'This agent is not registered on the active network.';
  }
  if (/fetch|NetworkError|Failed to fetch/i.test(raw)) {
    return 'Could not reach the agent service. Check that the backend is running.';
  }
  return raw.length > 140 ? raw.slice(0, 140) + '…' : raw || 'Hire failed.';
}

/** Render a skill result as readable key/value rows rather than raw JSON. */
function ResultView({ data }: { data: any }) {
  const clean = stripNoise(data);
  if (clean == null || typeof clean !== 'object') {
    return <div className="hire-result-text">{String(clean)}</div>;
  }
  const entries = Object.entries(clean).slice(0, 6);
  return (
    <dl className="hire-result">
      {entries.map(([k, v]) => (
        <div key={k} className="hire-result-row">
          <dt>{humanizeKey(k)}</dt>
          <dd>{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function humanizeKey(k: string): string {
  return k.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.length <= 4 ? v.map(String).join(', ') : `${v.length} items`;
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120);
  return String(v);
}
