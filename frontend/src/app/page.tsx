'use client';

import React, { useState } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import ProtocolTrace from '@/components/ProtocolTrace';
import { useI18n } from '@/lib/LanguageContext';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '');

export default function Home() {
  const { language, t } = useI18n();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [protocolData, setProtocolData] = useState<any[]>([]);
  const [hiringDecisions, setHiringDecisions] = useState<any[]>([]);

  const [isStressTesting, setIsStressTesting] = useState(false);

  const handleNewPayments = () => setRefreshTrigger(prev => prev + 1);

  const handleProtocolTrace = (log: any) => {
    if (log.type === 'hiring_decision' || log.type === 'a2a-hire') {
      // Map a2a-hire to a hiring decision shape if needed
      const decisionLog = log.type === 'a2a-hire' ? {
        tool: 'Autonomous Delegation',
        selectedAgent: log.worker,
        reason: log.reason || `Recursive hire by ${log.hirer}`,
        valueScore: 100, // Explicitly trusted sub-hire
        alternatives: [],
        approved: true
      } : log;

      setHiringDecisions(prev => [...prev, decisionLog]);
      setRefreshTrigger(prev => prev + 1); // Bump refresh for graph update on hire
    } else {
      setProtocolData(prev => [...prev, log]);
    }
  };

  const triggerStressTest = async () => {
    const clientId = localStorage.getItem('synergi_client_id');
    if (!clientId) return;
    setIsStressTesting(true);
    try {
      await fetch(`${API}/api/agent/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
    } catch (err) {
      console.error('Stress test failed', err);
    } finally {
      setTimeout(() => setIsStressTesting(false), 8000);
    }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* ── Pitch-Ready Hero Section ── */}
      <section style={{
        marginTop: 20,
        marginBottom: 48,
        padding: '60px 40px',
        background: 'linear-gradient(135deg, #FF854B 0%, #e6723c 100%)',
        color: '#fff',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '10rem', opacity: 0.05, fontWeight: 900, pointerEvents: 'none', color: '#fff' }}>
          SYNERGI
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="mono" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 0.9, marginBottom: 20, letterSpacing: '-0.05em' }}>
            {t.heroTitle}<br />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t.heroSubtitle}</span>
          </h1>
          <p className="mono" style={{ fontSize: '1.2rem', maxWidth: 600, fontWeight: 500, borderLeft: '4px solid rgba(255,255,255,0.3)', paddingLeft: 20, color: 'rgba(255,255,255,0.85)' }}>
            {t.heroLead}
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            <div className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6 }}>
              {t.recursiveDelegation}
            </div>
            <div className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6 }}>
              {t.paymentsVerified}
            </div>

            <button
              onClick={triggerStressTest}
              disabled={isStressTesting}
              style={{
                background: isStressTesting ? '#6b7280' : 'var(--accent-neon)',
                color: '#fff',
                padding: '8px 20px',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s',
                transform: isStressTesting ? 'translate(1px, 1px)' : 'none'
              }}
            >
              {isStressTesting ? t.runningStress : t.godMode}
            </button>
          </div>
        </div>
      </section>

      {/* ── Economy Graph ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            <span className="text-glow">{t.monitorTitle}</span> {t.monitorLabel}
          </h2>
          <span className="badge badge-stx">{language === 'hi' ? '60FPS रियलटाइम' : '60FPS REALTIME'}</span>
        </div>
        <div style={{ borderRadius: 10, padding: 4, background: '#f8f9fa', border: '1px solid #e5e7eb' }}>
          <EconomyGraph refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        gap: 32,
      }}>
        {/* Left: Agent Chat */}
        <div className="glass-panel" style={{ height: 800, padding: 32, display: 'flex', flexDirection: 'column', border: 'var(--border-strong)' }}>
          <AgentChat
            onNewPayments={handleNewPayments}
            onProtocolTrace={handleProtocolTrace}
          />
        </div>

        {/* Right: Transaction Log + Protocol Trace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, height: 800 }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <TransactionLog refreshTrigger={refreshTrigger} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ProtocolTrace traces={protocolData} hiringDecisions={hiringDecisions} />
          </div>
        </div>
      </div>

      {/* ── Tool Catalog ── */}
      <div style={{ marginTop: 64 }}>
        <ToolCatalog />
      </div>
    </div>
  );
}
