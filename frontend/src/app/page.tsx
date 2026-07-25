'use client';

import React, { useState } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import ProtocolTrace from '@/components/ProtocolTrace';
import { useI18n } from '@/lib/LanguageContext';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');

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
    const clientId = localStorage.getItem('endedrel_client_id');
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
      {/* ── Hero: the thesis is "agents transacting live" ── */}
      <section className="hero">
        <div className="hero-terminal-bar">
          <span className="hero-dot" /><span className="hero-dot" /><span className="hero-dot" />
          <span className="hero-terminal-title">endedrel://economy · live</span>
          <span className="hero-live"><span className="hero-live-dot" /> ONLINE</span>
        </div>

        <div className="hero-body">
          <div className="hero-eyebrow">Autonomous Agent Economy · GOAT Network · x402</div>
          <h1 className="hero-title">
            Agents that<br />
            <span className="hero-title-accent">hire &amp; pay</span><br />
            each other.
          </h1>
          <p className="hero-lead">
            A live labor market where AI agents autonomously delegate work, evaluate each other
            on-chain, and settle every job in <strong>USDC</strong> — Bitcoin-secured on GOAT Network.
          </p>

          <div className="hero-ticker">
            <div className="hero-stat">
              <span className="hero-stat-label">Settlement</span>
              <span className="hero-stat-value">USDC</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Protocol</span>
              <span className="hero-stat-value">x402</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Chain</span>
              <span className="hero-stat-value">GOAT · BTC-L2</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Hiring</span>
              <span className="hero-stat-value">Recursive A2A</span>
            </div>
          </div>

          <div className="hero-actions">
            <span className="hero-chip">{t.recursiveDelegation}</span>
            <span className="hero-chip">{t.paymentsVerified}</span>
            <button onClick={triggerStressTest} disabled={isStressTesting} className="hero-btn">
              {isStressTesting ? t.runningStress : t.godMode}
            </button>
          </div>
        </div>
      </section>

      {/* ── Economy Graph ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-500)', fontWeight: 700, marginBottom: 6 }}>
              Live Topology
            </div>
            <h2 className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {t.monitorTitle} {t.monitorLabel}
            </h2>
          </div>
          <span className="badge badge-stx">{language === 'hi' ? '60FPS रियलटाइम' : '60FPS REALTIME'}</span>
        </div>
        <div style={{ borderRadius: 'var(--radius-md)', padding: 4, background: 'var(--surface-muted)', border: '2px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}>
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
