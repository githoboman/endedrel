/* eslint-disable react-hooks/purity */
'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@/lib/LanguageContext';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '');

interface Payment {
  id: string;
  timestamp: number;
  endpoint: string;
  payer: string;
  worker: string;
  transaction: string;
  token: string;
  amount: string;
  explorerUrl?: string;
  isA2A: boolean;
  parentJobId?: string;
  depth: number;
  rawHeaders?: Record<string, string>;
  metadata?: {
    flashSwap?: {
      provider: string;
      pair: string;
      amount: string;
      fee: string;
      reason: string;
    }
  };
}

interface Props {
  refreshTrigger: number;
}

export default function TransactionLog({ refreshTrigger }: Props) {
  const { t } = useI18n();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [a2aCount, setA2aCount] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`${API}/api/payments`);
        const data = await res.json();
        setPayments(data.payments || []);
        setA2aCount(data.a2aCount || 0);
      } catch {}
    };
    fetchPayments();
  }, [refreshTrigger]);

  // Also poll
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/payments`);
        const data = await res.json();
        setPayments(data.payments || []);
        setA2aCount(data.a2aCount || 0);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ height: '100%', padding: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.transactions}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {payments.length} {t.total}
          </span>
        </div>
        {a2aCount > 0 && (
          <span className="badge badge-a2a" style={{ fontSize: '0.55rem' }}>{a2aCount} {t.a2a}</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {payments.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            {t.emptyTransactions}
          </div>
        ) : (
          payments.slice().reverse().map((p) => (
            <PaymentCard key={p.id} payment={p} />
          ))
        )}
      </div>
    </div>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  const { t } = useI18n();
  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '???';
  const timeAgo = (ts: number) => {

    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div style={{
      padding: '10px 12px', marginBottom: 6,
      background: payment.isA2A ? 'rgba(245,158,11,0.06)' : '#fafbfc',
      borderRadius: 8, border: `1px solid ${payment.isA2A ? 'rgba(245,158,11,0.15)' : 'var(--border-subtle)'}`,
      transition: 'all 0.2s',
    }}>
      {/* Row 1: endpoint + amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {payment.endpoint}
          </span>
          {payment.isA2A && <span className="badge badge-a2a" style={{ fontSize: '0.5rem' }}>{t.a2a}</span>}
          {payment.depth > 0 && (
            <span style={{ fontSize: '0.5rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {t.depth}:{payment.depth}
            </span>
          )}
        </div>
        <span className={`badge badge-${payment.token.toLowerCase() === 'sbtc' ? 'sbtc' : 'stx'}`} style={{ fontSize: '0.55rem' }}>
          {payment.amount} {payment.token}
        </span>
      </div>

      {/* Row 2: payer → worker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>{shortAddr(payment.payer)}</span>
        <span style={{ color: payment.isA2A ? '#f59e0b' : 'var(--accent-cyan)' }}>→</span>
        <span>{shortAddr(payment.worker)}</span>
        <span style={{ marginLeft: 'auto' }}>{timeAgo(payment.timestamp)}</span>
      </div>

      {/* Bitflow Flash Swap Metadata */}
      {payment.metadata?.flashSwap && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: 'rgba(16,185,129,0.06)',
          border: '1px dashed rgba(16,185,129,0.3)',
          borderRadius: 6,
          fontSize: '0.55rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 700, marginBottom: 4 }}>
            <span>⚡ {payment.metadata.flashSwap.provider} {t.flashSwap}</span>
            <span>{payment.metadata.flashSwap.pair}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
            {t.swapAmount}: <span style={{ color: 'var(--text-primary)' }}>{payment.metadata.flashSwap.amount}</span>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            {t.reason}: {payment.metadata.flashSwap.reason}
          </div>
        </div>
      )}

      {/* Explorer link */}
      {payment.explorerUrl && (
        <a
          href={payment.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block', marginTop: 4,
            fontSize: '0.55rem', color: 'var(--accent-cyan)', textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {t.viewExplorer}
        </a>
      )}
    </div>
  );
}
