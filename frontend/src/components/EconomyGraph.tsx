'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AgentAvatarMap } from '@/components/AgentIcons';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');

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
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Preload cartoon robot avatar images for canvas drawing
  useEffect(() => {
    const avatarSources: Record<string, string> = {
      user: '/agents/manager.jpg',
      manager: '/agents/manager.jpg',
      'weather-agent': '/agents/weather.jpg',
      'summarizer-agent': '/agents/summarizer.jpg',
      'math-agent': '/agents/math.jpg',
      'sentiment-agent': '/agents/sentiment.jpg',
      'code-agent': '/agents/code_explainer.jpg',
      'research-agent': '/agents/research.jpg',
      'coding-agent': '/agents/coding_agent.jpg',
      'translate-agent': '/agents/coding_agent.jpg',
    };
    Object.entries(avatarSources).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      imagesRef.current[key] = img;
    });
  }, []);

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
          token: p.token || 'USDC',
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

        // Draw cartoon robot avatar inside circle (clipped)
        const avatarImg = imagesRef.current[node.id];
        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius - 1, 0, Math.PI * 2);
          ctx.clip();
          const imgSize = (radius - 1) * 2;
          ctx.drawImage(avatarImg, node.x - radius + 1, node.y - radius + 1, imgSize, imgSize);
          ctx.restore();
          // Re-draw border on top of clipped image
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Fallback: draw letter if image not loaded
          ctx.fillStyle = colors.border;
          ctx.font = `bold ${node.type === 'worker' ? 9 : 10}px var(--font-mono, monospace)`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.type === 'user' ? 'U' : node.type === 'manager' ? 'M' : 'W', node.x, node.y - 2);
        }

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
      {/* Stat tiles — summary before detail */}
      <div className="responsive-grid-4" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginBottom: 14,
      }}>
        {[
          { label: 'Payments', value: stats.totalPayments, accent: 'var(--accent-500)' },
          { label: 'Volume', value: `${stats.totalVolume}`, unit: 'USDC', accent: 'var(--btc)' },
          { label: 'A2A Hires', value: stats.a2aCount, accent: 'var(--accent-500)' },
          { label: 'Agents', value: stats.activeAgents, accent: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '10px 12px',
            border: '2px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            boxShadow: '2px 2px 0 0 var(--border-strong)',
          }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: s.accent, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</span>
              {s.unit && <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Economy Topology
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.6rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} /> LIVE
        </span>
      </div>
      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '2px solid var(--border-strong)', background: 'var(--bg-tertiary)' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 'clamp(180px, 34vw, 260px)', display: 'block' }} />
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 8, left: 12,
          display: 'flex', gap: 14, fontSize: '0.6rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
        }}>
          {[
            { color: 'var(--accent-500)', label: 'User → Manager' },
            { color: 'var(--accent-500)', label: 'Manager → Worker' },
            { color: 'var(--btc)', label: 'A2A Recursive' },
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
