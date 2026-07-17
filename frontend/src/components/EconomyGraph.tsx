'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '');

interface PaymentNode {
  id: string;
  label: string;
  type: 'user' | 'manager' | 'worker';
  x: number;
  y: number;
  reputation?: number;
  earnings?: number;
}

interface PaymentEdge {
  id: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  isA2A: boolean;
  timestamp: number;
  active: boolean;
}

interface EconomyStats {
  totalPayments: number;
  totalVolume: string;
  a2aCount: number;
  activeAgents: number;
}

const NODE_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  user:    { bg: '#ffffff', border: '#4f46e5', glow: 'rgba(79,70,229,0.15)' },
  manager: { bg: '#ffffff', border: '#0891b2', glow: 'rgba(8,145,178,0.15)' },
  worker:  { bg: '#ffffff', border: '#059669', glow: 'rgba(5,150,105,0.15)' },
};

const WORKER_AGENTS = [
  { id: 'weather-agent', label: 'Weather', slot: 0 },
  { id: 'summarizer-agent', label: 'Summarizer', slot: 1 },
  { id: 'math-agent', label: 'Math', slot: 2 },
  { id: 'sentiment-agent', label: 'Sentiment', slot: 3 },
  { id: 'code-agent', label: 'CodeExplain', slot: 4 },
  { id: 'research-agent', label: 'Research', slot: 5 },
  { id: 'coding-agent', label: 'Coding', slot: 6 },
  { id: 'translate-agent', label: 'Translate', slot: 7 },
];

export default function EconomyGraph({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [edges, setEdges] = useState<PaymentEdge[]>([]);
  const [stats, setStats] = useState<EconomyStats>({ totalPayments: 0, totalVolume: '0', a2aCount: 0, activeAgents: 0 });
  const [registry, setRegistry] = useState<any[]>([]);
  const nodesRef = useRef<PaymentNode[]>([]);

  // Build node layout
  const buildNodes = useCallback((width: number, height: number): PaymentNode[] => {
    const cx = width / 2;
    const nodes: PaymentNode[] = [
      { id: 'user', label: 'YOU', type: 'user', x: cx, y: 40 },
      { id: 'manager', label: 'Manager Agent', type: 'manager', x: cx, y: height * 0.38 },
    ];
    const workerY = height * 0.78;
    const spacing = (width - 80) / (WORKER_AGENTS.length - 1);
    const startX = 40;
    WORKER_AGENTS.forEach((w, i) => {
      const agent = registry.find((a: any) => a.id === w.id);
      nodes.push({
        id: w.id, label: w.label, type: 'worker',
        x: startX + i * spacing, y: workerY,
        reputation: agent?.reputation ?? 80,
        earnings: agent?.earnings ?? 0,
      });
    });
    return nodes;
  }, [registry]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paymentsRes, registryRes] = await Promise.all([
          fetch(`${API}/api/payments`).then(r => r.json()).catch(() => ({ payments: [], count: 0, a2aCount: 0, totalVolume: '0' })),
          fetch(`${API}/api/registry`).then(r => r.json()).catch(() => ({ agents: [] })),
        ]);
        setRegistry(registryRes.agents || []);
        setStats({
          totalPayments: paymentsRes.count || 0,
          totalVolume: paymentsRes.totalVolume || '0',
          a2aCount: paymentsRes.a2aCount || 0,
          activeAgents: (registryRes.agents || []).length,
        });
        // Build edges from payments
        const payments = paymentsRes.payments || [];
        const newEdges: PaymentEdge[] = payments.slice(0, 30).map((p: any, i: number) => ({
          id: p.id || `edge-${i}`,
          from: p.isA2A ? (p.payer || 'manager') : 'manager',
          to: p.endpoint ? agentIdFromEndpoint(p.endpoint) : 'unknown',
          amount: p.amount || '0',
          token: p.token || 'STX',
          isA2A: p.isA2A || false,
          timestamp: p.timestamp || Date.now(),
          active: Date.now() - (p.timestamp || 0) < 10000,
        }));
        setEdges(newEdges);
      } catch (e) { /* silent */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    nodesRef.current = buildNodes(W, H);

    let tick = 0;
    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;

      // Draw edges: user→manager (always), manager→workers (based on payments)
      const userNode = nodes.find(n => n.id === 'user')!;
      const managerNode = nodes.find(n => n.id === 'manager')!;

      // User → Manager line
      drawEdge(ctx, userNode, managerNode, false, tick, '#FF854B');

      // Manager → Workers
      const workerNodes = nodes.filter(n => n.type === 'worker');
      const activeWorkerIds = new Set(edges.map(e => e.to));
      workerNodes.forEach(wn => {
        const isActive = activeWorkerIds.has(wn.id);
        const edgeData = edges.find(e => e.to === wn.id);
        const isA2A = edgeData?.isA2A || false;
        const color = isA2A ? '#a855f7' : '#FF854B'; // Purple for A2A, Orange for Standard
        drawEdge(ctx, managerNode, wn, isActive, tick, color);
      });

      // A2A recursive edges (research→summarizer, coding→code-agent)
      const a2aEdges = edges.filter(e => e.isA2A);
      a2aEdges.forEach(e => {
        const fromNode = nodes.find(n => n.id === e.from);
        const toNode = nodes.find(n => n.id === e.to);
        if (fromNode && toNode) {
          drawCurvedEdge(ctx, fromNode, toNode, tick, '#a855f7');
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const colors = NODE_COLORS[node.type];
        const isActive = node.id === 'user' || node.id === 'manager' || activeWorkerIds.has(node.id);
        const pulse = isActive ? Math.sin(tick * 0.05) * 3 : 0;
        const radius = node.type === 'user' ? 22 : node.type === 'manager' ? 26 : 18;

        // Glow
        if (isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 8 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = colors.glow;
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.bg;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Icon/Label
        ctx.fillStyle = colors.border;
        ctx.font = `bold ${node.type === 'worker' ? 9 : 10}px var(--font-mono, monospace)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.type === 'user' ? 'U' : node.type === 'manager' ? 'M' : 'W', node.x, node.y - 2);

        // Label below
        ctx.fillStyle = '#475569';
        ctx.font = `600 ${node.type === 'worker' ? 9 : 11}px sans-serif`;
        ctx.fillText(node.label, node.x, node.y + radius + 14);

        // Reputation bar for workers
        if (node.type === 'worker' && node.reputation) {
          const barW = 30;
          const barH = 3;
          const bx = node.x - barW / 2;
          const by = node.y + radius + 24;
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(bx, by, barW, barH);
          const pct = Math.min(node.reputation / 100, 1);
          ctx.fillStyle = pct > 0.7 ? '#10b981' : pct > 0.4 ? '#f59e0b' : '#ef4444';
          ctx.fillRect(bx, by, barW * pct, barH);
        }
      });

      // Floating particles along active edges
      if (edges.length > 0) {
        const activeEdge = edges[tick % edges.length];
        const fromNode = activeEdge ? nodes.find(n => n.id === 'manager') : null;
        const toNode = activeEdge ? nodes.find(n => n.id === activeEdge.to) : null;
        if (fromNode && toNode) {
          const t = (tick % 60) / 60;
          const px = fromNode.x + (toNode.x - fromNode.x) * t;
          const py = fromNode.y + (toNode.y - fromNode.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = activeEdge.isA2A ? '#a855f7' : '#06b6d4';
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [edges, buildNodes]);

  return (
    <div className="glass-panel" style={{ padding: 16 }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ECONOMY TOPOLOGY
          </span>
          <span className="badge badge-stx" style={{ fontSize: '0.6rem' }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Payments', value: stats.totalPayments, color: '#06b6d4' },
            { label: 'Volume', value: `${stats.totalVolume} STX`, color: '#FF854B' },
            { label: 'A2A Hires', value: stats.a2aCount, color: '#f59e0b' },
            { label: 'Agents', value: stats.activeAgents, color: '#FF854B' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 260, display: 'block' }} />
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 8, left: 12,
          display: 'flex', gap: 14, fontSize: '0.6rem', color: '#64748b',
        }}>
          {[
            { color: '#FF854B', label: 'User → Manager' },
            { color: '#FF854B', label: 'Manager → Worker' },
            { color: '#f59e0b', label: 'A2A Recursive' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 3, borderRadius: 1, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── helpers ──

function agentIdFromEndpoint(endpoint: string): string {
  const map: Record<string, string> = {
    '/weather': 'weather-agent', '/summarize': 'summarizer-agent',
    '/math-solve': 'math-agent', '/sentiment': 'sentiment-agent',
    '/code-explain': 'code-agent', '/research': 'research-agent',
    '/coding': 'coding-agent', '/translate': 'translate-agent',
  };
  return map[endpoint] || 'manager';
}

function drawEdge(ctx: CanvasRenderingContext2D, from: PaymentNode, to: PaymentNode, active: boolean, tick: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = active ? color : '#e2e8f0';
  ctx.lineWidth = active ? 3 : 1.2;

  if (active) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
  } else {
    ctx.shadowBlur = 0;
    ctx.setLineDash([4, 4]);
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function drawCurvedEdge(ctx: CanvasRenderingContext2D, from: PaymentNode, to: PaymentNode, tick: number, color: string) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - 30;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(mx, my, to.x, to.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}
