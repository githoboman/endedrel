import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Terminal, Loader2, Shield, Zap, DollarSign, Activity, Share2,
  ChevronDown, ChevronUp, Bot, Globe, Calculator, Code2, BookOpen, Languages, Sparkles,
} from 'lucide-react';
import { A2ATopology } from './A2ATopology';
import { getAgentIcon, getAgentColor } from './AgentIcons';
import { useI18n } from '@/lib/LanguageContext';
import { fmtCost } from '@/lib/format';

// ── Example queries surfaced in the empty state and quick-chip bar ──
const EXAMPLE_QUERIES = [
  { label: 'Weather in Lagos', icon: Globe, color: '#0ea5e9', category: 'DATA' },
  { label: 'Research quantum computing and summarize findings', icon: BookOpen, color: '#8b5cf6', category: 'RESEARCH' },
  { label: 'Solve: 2x² + 5x − 12 = 0', icon: Calculator, color: '#f59e0b', category: 'MATH' },
  { label: 'Explain this code: console.log(42 >> 1)', icon: Code2, color: '#10b981', category: 'DEV' },
  { label: 'Analyze sentiment: "The new protocol blew my mind!"', icon: Sparkles, color: '#ec4899', category: 'NLP' },
  { label: 'Translate "Autonomous agents" to French', icon: Languages, color: '#ff4f00', category: 'NLP' },
];

// ── Interfaces ──
interface Params {
  onNewPayments: (amount: number) => void;
  onProtocolTrace: (log: any) => void;
}

interface Message {
  role: 'user' | 'system' | 'assistant';
  content: string;
  cost?: number;
  depth?: number;
  subAgentHires?: any[];
}

// ── Simple inline markdown renderer ──
const SimpleMarkdown = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--accent-500)' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              fontSize: '0.88em',
            }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </span>
  );
};

// ── Sub-agent hiring tree ──
const SubAgentTree = ({ hires, depth = 0 }: { hires: any[], depth?: number }) => {
  if (!hires || hires.length === 0) return null;
  return (
    <div style={{
      marginTop: 12,
      paddingLeft: depth === 0 ? 0 : 16,
      borderLeft: depth === 0 ? 'none' : '1px solid var(--border-subtle)',
    }}>
      {hires.map((hire, idx) => {
        const Icon = getAgentIcon(hire.agent);
        const color = getAgentColor(hire.agent);
        return (
          <div key={idx} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ color }}><Icon size={14} /></div>
              <span className="mono">Hired <strong style={{ color }}>{hire.agent}</strong></span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                — {fmtCost(hire.cost, hire.currency)}
              </span>
            </div>
            {hire.subAgentHires && hire.subAgentHires.length > 0 && (
              <SubAgentTree hires={hire.subAgentHires} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Hiring Decision Message — shows expandable "Why this agent?" card ──
const HiringDecisionMessage = ({
  msg, isUser, isSystem, hiringMatch,
}: {
  msg: Message;
  isUser: boolean;
  isSystem: boolean;
  hiringMatch: RegExpMatchArray | null | false;
}) => {
  const [whyOpen, setWhyOpen] = useState(false);
  const { language } = useI18n();

  const isHire = isSystem && hiringMatch;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeInUp 0.25s ease',
    }}>
      {/* Role Label */}
      <span className="mono" style={{
        fontSize: '0.62rem',
        marginBottom: 4,
        color: 'var(--text-muted)',
        marginLeft: isUser ? 0 : 4,
        marginRight: isUser ? 4 : 0,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {isUser ? 'YOU' : isSystem ? 'SYSTEM' : 'AGENT'}
      </span>

      {/* Message Bubble */}
      <div style={{
        maxWidth: isSystem ? '100%' : '85%',
        width: isSystem ? '100%' : undefined,
        padding: '14px 18px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(14,165,233,0.03) 100%)'
          : isHire
            ? 'linear-gradient(135deg, rgba(255,79,0,0.06) 0%, rgba(255,133,75,0.03) 100%)'
            : 'var(--bg-secondary)',
        border: isUser
          ? '1px solid rgba(14,165,233,0.25)'
          : isHire
            ? '1px solid rgba(255,79,0,0.25)'
            : '1px solid var(--border-subtle)',
        boxShadow: isHire ? '0 2px 12px rgba(255,79,0,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
      }}>
        <SimpleMarkdown text={msg.content} />

        {/* Hiring Decision "Why?" expandable card */}
        {isHire && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setWhyOpen(o => !o)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: whyOpen ? 'rgba(255,79,0,0.12)' : 'rgba(255,79,0,0.06)',
                border: '1px solid rgba(255,79,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.67rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--accent-500)',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
              }}
            >
              {whyOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              WHY THIS AGENT?
            </button>

            {whyOpen && (
              <div style={{
                marginTop: 8,
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                animation: 'fadeInUp 0.2s ease',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>
                  Autonomous Hiring Rationale
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent-500)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', minWidth: 60 }}>Formula</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Value Score = reputation² ÷ (price × 10,000)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent-500)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', minWidth: 60 }}>Decision</span>
                    <span style={{ fontSize: '0.78rem' }}>Manager compared all eligible agents in this category and selected the highest Value Score candidate that satisfied the task requirements.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent-500)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', minWidth: 60 }}>Settlement</span>
                    <span style={{ fontSize: '0.78rem' }}>Payment sent via x402 on BOT Network. Check Protocol Trace for the full order lifecycle.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sub-agent topology visualization */}
        {msg.subAgentHires && msg.subAgentHires.length > 0 && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="brutal-text" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                A2A Economy Loop Visualized
              </div>
              <button
                onClick={() => { alert('Topology snapshot copied to clipboard for X sharing! 🚀'); }}
                className="btn"
                style={{ padding: '6px 10px', fontSize: '0.6rem', color: '#111111' }}
              >
                <Share2 size={12} /> {language === 'es' ? 'COMPARTIR' : (language === 'hi' ? 'शेयर' : 'SHARE')}
              </button>
            </div>
            <A2ATopology hires={msg.subAgentHires} />
            <div style={{ marginTop: 12 }}>
              <details>
                <summary style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }} className="mono">
                  {language === 'es' ? 'Ver registros de ejecución' : (language === 'hi' ? 'निष्पादन लॉग देखें' : 'View Execution Logs')}
                </summary>
                <SubAgentTree hires={msg.subAgentHires} />
              </details>
            </div>
          </div>
        )}

        {/* Cost display */}
        {msg.cost && (
          <div style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: '1px dashed var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--btc)',
            fontSize: '0.75rem',
          }} className="mono">
            <DollarSign size={12} />
            <span>COST: {fmtCost(msg.cost)}</span>
          </div>
        )}
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Main AgentChat Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AgentChat({ onNewPayments, onProtocolTrace }: Params) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'planning' | 'executing' | 'verifying'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const clientId = useRef('');

  useEffect(() => {
    let id = localStorage.getItem('endedrel_client_id');
    if (!id) {
      id = `client_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('endedrel_client_id', id);
    }
    clientId.current = id;
  }, []);

  useEffect(() => {
    let sse: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let hasShownConnectionError = false;
    let isConnected = false;

    const connect = () => {
      if (sse) sse.close();

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`SSE: Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping.`);
        if (!hasShownConnectionError) {
          hasShownConnectionError = true;
          setMessages(prev => [...prev, {
            role: 'system',
            content: '**Backend offline.** Start the backend server (`cd backend && npm run dev`) then refresh.',
            depth: 0
          }]);
        }
        return;
      }

      const sseUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '')}/api/agent/events?clientId=${clientId.current}`;
      sse = new EventSource(sseUrl);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        console.log('SSE connected');
        reconnectAttempts = 0;
        isConnected = true;
        hasShownConnectionError = false;
      };

      sse.addEventListener('step', (event) => {
        try {
          const data = JSON.parse(event.data);
          onProtocolTrace(data);
        } catch (e) { console.error('SSE Step Error:', e); }
      });

      sse.addEventListener('thought', (event) => {
        try {
          const data = JSON.parse(event.data);
          onProtocolTrace(data);
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg?.content === data.content) return prev;
            return [...prev, {
              role: 'assistant',
              content: data.content,
              depth: data.depth || 1,
              subAgentHires: data.subAgentHires
            }];
          });
        } catch (e) { console.error('SSE Thought Error:', e); }
      });

      sse.addEventListener('payment', (event) => {
        try {
          const data = JSON.parse(event.data);
          onNewPayments(data.amount);
          onProtocolTrace({ type: 'payment', amount: data.amount, agent: data.agent || data.worker, ...data });
        } catch (e) { console.error('SSE Payment Error:', e); }
      });

      sse.addEventListener('a2a-hire', (event) => {
        try {
          const data = JSON.parse(event.data);
          onProtocolTrace({ type: 'a2a-hire', ...data });
          setMessages(prev => [...prev, {
            role: 'system',
            content: `🔄 **Recursive Hire:** ${data.hirer} hired **${data.worker}** for ${data.cost} USDC.`,
            depth: data.depth || 1
          }]);
        } catch (e) { console.error('SSE A2A Error:', e); }
      });

      sse.addEventListener('done', () => {
        setAgentStatus('idle');
        setIsProcessing(false);
      });

      sse.onerror = () => {
        isConnected = false;
        if (sse) sse.close();
        setAgentStatus('idle');
        setIsProcessing(false);
        reconnectAttempts++;
        const backoff = Math.min(3000 * Math.pow(1.5, reconnectAttempts - 1), 15000);
        console.warn(`SSE disconnected. Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(backoff)}ms`);
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && !hasShownConnectionError) {
          hasShownConnectionError = true;
          setMessages(prev => [...prev, {
            role: 'system',
            content: '**Connection lost.** Backend may be offline. Start with `cd backend && npm run dev`, then refresh.',
            depth: 0
          }]);
        }
        reconnectTimeout = setTimeout(connect, backoff);
      };
    };

    connect();

    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('query');
    if (initialQuery) setQuery(initialQuery);

    return () => {
      if (sse) sse.close();
      clearTimeout(reconnectTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);
    setAgentStatus('planning');
    scrollToBottom();

    try {
      const response = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '')}/api/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, clientId: clientId.current })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.finalAnswer) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.finalAnswer,
          depth: 0
        }]);
      }

      setIsProcessing(false);
      setAgentStatus('idle');
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, { role: 'system', content: `**Error:** Failed to connect to agent service.` }]);
      setIsProcessing(false);
      setAgentStatus('idle');
    }
  };

  const fillQuery = (label: string) => {
    setQuery(label);
    setTimeout(() => {
      const input = document.getElementById('agent-chat-input');
      if (input) (input as HTMLInputElement).focus();
    }, 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        paddingBottom: 20,
        borderBottom: '2px solid var(--border-strong)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, var(--accent-500) 0%, #ff854b 100%)',
            boxShadow: '0 2px 12px rgba(255,79,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Terminal size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {t.managerAgent}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                width: 7, height: 7,
                background: agentStatus === 'idle' ? 'var(--text-muted)' : 'var(--success)',
                borderRadius: '50%',
                transition: 'background 0.3s ease',
                boxShadow: agentStatus !== 'idle' ? '0 0 6px var(--success)' : 'none',
              }} />
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {agentStatus === 'idle' ? 'STANDBY' : agentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div className="badge badge-stx">
            <Shield size={11} style={{ marginRight: 5 }} />
            SECURE
          </div>
          <div className="badge badge-sbtc">
            <Zap size={11} style={{ marginRight: 5 }} />
            FAST
          </div>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        paddingRight: 8,
        marginBottom: 16,
      }}>

        {/* ── Empty State: animated welcome + example chips grid ── */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '20px 8px 8px',
            animation: 'fadeInUp 0.4s ease',
          }}>
            {/* Animated bot icon */}
            <div style={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, var(--accent-500) 0%, #ff854b 100%)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,79,0,0.22)',
              marginBottom: 14,
              animation: 'pulse 2.8s ease-in-out infinite',
            }}>
              <Bot size={28} color="#fff" />
            </div>

            <h3 style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 6,
              textAlign: 'center',
            }}>Manager Agent — Ready</h3>

            <p style={{
              fontSize: '0.78rem',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              Ask anything. Agents will autonomously plan, hire, and settle on-chain in{' '}
              <strong style={{ color: 'var(--accent-500)' }}>USDC</strong>.
            </p>

            {/* 2-column chips grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              width: '100%',
            }}>
              {EXAMPLE_QUERIES.map((q, i) => {
                const Icon = q.icon;
                return (
                  <button
                    key={i}
                    onClick={() => fillQuery(q.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = q.color;
                      e.currentTarget.style.background = `${q.color}10`;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 4px 14px ${q.color}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                      background: `${q.color}1a`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Icon size={13} color={q.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.58rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: q.color,
                        letterSpacing: '0.08em',
                        marginBottom: 2,
                        textTransform: 'uppercase',
                      }}>{q.category}</div>
                      <div style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>{q.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Message list ── */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';
          // Detect hiring decision pattern in system messages
          const hiringMatch = isSystem && msg.content.match(/\*\*([^*]+)\*\*.*?(\d+\.\d+)\s*USDC/i);

          return (
            <HiringDecisionMessage
              key={idx}
              msg={msg}
              isUser={isUser}
              isSystem={isSystem}
              hiringMatch={hiringMatch}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <input
            id="agent-chat-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholder}
            disabled={isProcessing}
            className="mono"
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1.5px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '13px 20px',
              paddingRight: 60,
              fontSize: '0.92rem',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-500)';
              e.target.style.boxShadow = '0 0 0 3px rgba(255,79,0,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-subtle)';
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          />
          <button
            type="submit"
            disabled={!query.trim() || isProcessing}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: query.trim() && !isProcessing ? 'var(--accent-500)' : 'var(--border-subtle)',
              border: 'none',
              color: '#fff',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              cursor: query.trim() && !isProcessing ? 'pointer' : 'default',
              boxShadow: query.trim() && !isProcessing ? '0 2px 10px rgba(255,79,0,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isProcessing ? <Loader2 size={18} className="spin" /> : <Send size={18} strokeWidth={2.5} />}
          </button>
        </form>

        {/* ── Quick-access chip bar (shown after first message) ── */}
        {messages.length > 0 && !isProcessing && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAMPLE_QUERIES.slice(0, 4).map((q, i) => {
              const Icon = q.icon;
              return (
                <button
                  key={i}
                  onClick={() => fillQuery(q.label)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.67rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = q.color;
                    e.currentTarget.style.color = q.color;
                    e.currentTarget.style.background = `${q.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  <Icon size={10} />
                  {q.label.length > 26 ? q.label.slice(0, 26) + '…' : q.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Thinking status bar ── */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            padding: '6px 0',
          }} className="mono">
            <Activity size={13} className="spin" color="var(--success)" />
            <span>{t.thinking}</span>
          </div>
        )}
      </div>
    </div>
  );
}
