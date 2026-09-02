'use client';

import React, { useState } from 'react';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ToolCatalog from '@/components/ToolCatalog';
import ProtocolTrace from '@/components/ProtocolTrace';
import { useI18n } from '@/lib/LanguageContext';
import { SETTLEMENT_SYMBOL } from '@/lib/userSession';

export default function AppDashboard() {
  const { language, t } = useI18n();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [protocolData, setProtocolData] = useState<any[]>([]);
  const [hiringDecisions, setHiringDecisions] = useState<any[]>([]);

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '80px',
      padding: '40px 0 80px 0'
    }}>

      {/* ── SECTION 1: Live Topology ── */}
      <section>
        <div className="neo-glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
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
        <div className="neo-glass-panel" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
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
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        
        {/* Transaction Logs */}
        <div className="neo-glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className="neo-header">
            <span>{SETTLEMENT_SYMBOL} Settlement</span>
            <span className="badge badge-stx">x402</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <TransactionLog refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* Protocol Trace */}
        <div className="neo-glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
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

    </div>
  );
}
