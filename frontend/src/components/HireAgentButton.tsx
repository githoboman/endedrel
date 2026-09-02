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
import { authenticate, getConnectedAddress, isWalletAvailable } from '@/lib/userSession';
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
      setMsg(`Done — paid ${hire.amountUsdc} USDC, escrow released.`);
    } catch (err: any) {
      setPhase('error');
      // viem user-rejection surfaces a friendly shortMessage.
      setMsg(err?.shortMessage || err?.message || 'Hire failed.');
    }
  }

  const busy = phase === 'hiring' || phase === 'working';
  const label =
    phase === 'hiring' ? 'Confirm in wallet…' :
    phase === 'working' ? 'Working…' :
    phase === 'done' ? 'Hire again' :
    hireable ? `Hire · ${price} USDC` : 'Off-chain';

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={onHire}
        disabled={busy || !hireable}
        title={hireable ? `Pay ${price} USDC to hire ${name}` : 'Not available on-chain yet'}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: '0.8rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          borderRadius: 'var(--radius-sm)',
          border: 'var(--border-width) solid var(--border-strong)',
          background: !hireable ? 'var(--bg-secondary)' : busy ? 'var(--bg-secondary)' : 'var(--accent-500)',
          color: !hireable ? 'var(--text-tertiary)' : busy ? 'var(--text-secondary)' : '#fff',
          cursor: busy || !hireable ? 'not-allowed' : 'pointer',
          boxShadow: hireable && !busy ? 'var(--shadow-sm)' : 'none',
        }}
      >
        {label}
      </button>

      {phase !== 'idle' && (
        <div
          className="mono"
          style={{
            marginTop: 8, fontSize: '0.7rem', lineHeight: 1.5,
            color: phase === 'error' ? 'var(--danger, #d33)' : 'var(--text-secondary)',
          }}
        >
          {msg}
          {settlementUrl && (
            <>
              {' '}
              <a href={settlementUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-500)', fontWeight: 700 }}>
                view tx ↗
              </a>
            </>
          )}
          {phase === 'done' && result && (
            <pre style={{
              marginTop: 6, padding: 8, maxHeight: 120, overflow: 'auto',
              background: 'var(--bg-secondary)', border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.66rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {JSON.stringify(stripNoise(result), null, 2)}
            </pre>
          )}
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
