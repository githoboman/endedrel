'use client';

import React, { useState, useEffect } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import ProtocolTrace from '@/components/ProtocolTrace';
import { useI18n } from '@/lib/LanguageContext';
import { SETTLEMENT_SYMBOL, getConnectedChainId, switchNetwork, getProvider, botTestnet, botMainnet } from '@/lib/userSession';

export default function AppDashboard() {
  const { language, t } = useI18n();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [protocolData, setProtocolData] = useState<any[]>([]);
  const [hiringDecisions, setHiringDecisions] = useState<any[]>([]);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      const id = await getConnectedChainId();
      setChainId(id);
    };
    checkNetwork();
    const provider = getProvider();
    if (provider?.on) {
      provider.on('chainChanged', () => checkNetwork());
    }
  }, []);

  const handleNewPayments = () => setRefreshTrigger(prev => prev + 1);

  const handleProtocolTrace = (log: any) => {
    if (log.type === 'hiring_decision' || log.type === 'a2a-hire') {
      const decisionLog = log.type === 'a2a-hire' ? {
        tool: 'Autonomous Delegation',
        selectedAgent: log.worker,
        reason: log.reason || `Recursive hire by ${log.hirer}`,
        valueScore: 100,
        alternatives: [],
        approved: true
      } : log;

      setHiringDecisions(prev => [...prev, decisionLog]);
      setRefreshTrigger(prev => prev + 1);
    } else {
      setProtocolData(prev => [...prev, log]);
    }
  };

  const isBot = chainId === botTestnet.id || chainId === botMainnet.id;

  return (
    <div className="dashboard-layout">

      {/* ── SIDEBAR: Network Context ── */}
      <aside style={{
        width: '260px',
        flexShrink: 0,
        position: 'sticky',
        top: '100px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="neo-glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Network Context
          </div>
          
          <button 
            onClick={() => switchNetwork(botTestnet.id)}
            style={{
              padding: '12px 16px',
              background: isBot ? '#fff1eb' : 'var(--bg-secondary)',
              border: `2px solid ${isBot ? '#ff4f00' : 'var(--border-subtle)'}`,
              color: isBot ? '#ff4f00' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            BOT CHAIN
            {isBot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4f00' }} />}
          </button>



          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px', lineHeight: 1.5 }}>
            Switching contexts will prompt your wallet to change networks. Current settlement asset: <strong>{SETTLEMENT_SYMBOL}</strong>.
          </div>
        </div>
      </aside>

      {/* ── MAIN DASHBOARD ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '60px',
        minWidth: 0 // Prevent flex blowout
      }}>

        {/* ── SECTION 1: Live Topology ── */}
        <section>
          <div className="neo-glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-header">
              <span>{t.monitorTitle} {t.monitorLabel}</span>
              <span className="badge badge-a2a">{language === 'hi' ? '60FPS रियलटाइम' : '60FPS REALTIME'}</span>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <EconomyGraph refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Command Terminal ── */}
        <section>
          <div className="neo-glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-header">
              <span>Terminal / Command Input</span>
              <span className="badge badge-stx">Encrypted</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <AgentChat
                onNewPayments={handleNewPayments}
                onProtocolTrace={handleProtocolTrace}
              />
            </div>
          </div>
        </section>

        {/* ── SECTION 3: On-Chain Data (2 Columns) ── */}
        <section className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          
          {/* Transaction Logs */}
          <div className="neo-glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-header">
              <span>{SETTLEMENT_SYMBOL} Settlement</span>
              <span className="badge badge-stx">x402</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <TransactionLog refreshTrigger={refreshTrigger} />
            </div>
          </div>

          {/* Protocol Trace */}
          <div className="neo-glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-header">
              <span>Protocol Trace</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ProtocolTrace traces={protocolData} hiringDecisions={hiringDecisions} />
            </div>
          </div>

        </section>

        {/* ── SECTION 4: Network Tools ── */}
        <section>
          <div className="neo-glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <div className="neo-header">
              <span>Active Network Tools</span>
            </div>
            <div style={{ flex: 1 }}>
              <ToolCatalog />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
