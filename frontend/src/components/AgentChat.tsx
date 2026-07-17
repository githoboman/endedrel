import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Loader2, Shield, Zap, DollarSign, Activity, Share2 } from 'lucide-react';
import { A2ATopology } from './A2ATopology';
import { getAgentIcon, getAgentColor } from './AgentIcons';
import { useI18n } from '@/lib/LanguageContext';

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

const SimpleMarkdown = ({ text }: { text: string }) => {
  // Ultra-simple markdown parser for bold and code
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--accent-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)'
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ color: color }}>
                <Icon size={14} />
              </div>
              <span className="mono">Hired <strong style={{ color: color }}>{hire.agent}</strong></span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>— {hire.cost} {hire.currency || 'STX'}</span>
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
    let id = localStorage.getItem('synergi_client_id');
    if (!id) {
      id = `client_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('synergi_client_id', id);
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

      const sseUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '')}/api/agent/events?clientId=${clientId.current}`;
      sse = new EventSource(sseUrl);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        console.log('SSE connected');
        reconnectAttempts = 0;
        isConnected = true;
        hasShownConnectionError = false;
      };

      // 1. Step Updates (Protocol Trace)
      sse.addEventListener('step', (event) => {
        try {
          const data = JSON.parse(event.data);
          onProtocolTrace(data);
        } catch (e) { console.error('SSE Step Error:', e); }
      });

      // 2. Thoughts / Inner Monologue
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

      // 3. Payment Events (Real-time Wallet Updates)
      sse.addEventListener('payment', (event) => {
        try {
          const data = JSON.parse(event.data);
          onNewPayments(data.amount);
          onProtocolTrace({ type: 'payment', amount: data.amount, agent: data.agent || data.worker, ...data });
        } catch (e) { console.error('SSE Payment Error:', e); }
      });

      // 4. A2A Hiring Events (Recursive Economy Visualization)
      sse.addEventListener('a2a-hire', (event) => {
        try {
          const data = JSON.parse(event.data);
          onProtocolTrace({ type: 'a2a-hire', ...data });

          setMessages(prev => [...prev, {
            role: 'system',
            content: `🔄 **Recursive Hire:** ${data.hirer} hired **${data.worker}** for ${data.cost} STX.`,
            depth: data.depth || 1
          }]);
        } catch (e) { console.error('SSE A2A Error:', e); }
      });

      // 5. Completion
      sse.addEventListener('done', () => {
        setAgentStatus('idle');
        setIsProcessing(false);
      });

      // 6. Connection error — only handle via onerror, NOT the 'error' event listener
      //    The EventSource 'error' event fires on EVERY connection failure (no data),
      //    so we must NOT add messages here to avoid spam.

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

    // Support marketplace hiring via URL query
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('query');
    if (initialQuery) {
      setQuery(initialQuery);
    }

    return () => {
      if (sse) sse.close();
      clearTimeout(reconnectTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only scroll to bottom when a new message is sent or received by user action, not on initial load.
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

    try {
      const response = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '')}/api/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, clientId: clientId.current })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // The final result is also sent via SSE 'done', but we can update UI here from the direct response too
      if (result.finalAnswer) {
         setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.finalAnswer,
            depth: 0
         }]);
      }

      // Explicit UI reset after successful API fetch to prevent stuck "Thinking" state
      setIsProcessing(false);
      setAgentStatus('idle');

    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, { role: 'system', content: `**Error:** Failed to connect to agent service.` }]);
      setIsProcessing(false);
      setAgentStatus('idle');
    }
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
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
             width: 40, height: 40,
             background: 'var(--accent-primary)',
             boxShadow: '0 2px 8px rgba(14,165,233,0.2)',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             borderRadius: 'var(--radius-sm)'
          }}>
            <Terminal size={24} color="#fff" strokeWidth={3} />
          </div>
          <div>
            <h2 className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {t.managerAgent}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                width: 8, height: 8, background: agentStatus === 'idle' ? 'var(--text-muted)' : 'var(--accent-success)',
                borderRadius: '50%', border: '1px solid var(--border-subtle)'
              }} />
              <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {agentStatus === 'idle' ? 'STANDBY' : agentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', gap: 12 }}>
           <div className="badge badge-stx">
              <Shield size={12} style={{ marginRight: 6 }} />
              SECURE
           </div>
           <div className="badge badge-sbtc">
              <Zap size={12} style={{ marginRight: 6 }} />
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
        gap: 16,
        paddingRight: 10,
        marginBottom: 20
      }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
            }}>
              {/* Role Label */}
              <span className="mono" style={{
                fontSize: '0.65rem',
                marginBottom: 4,
                color: 'var(--text-muted)',
                marginLeft: isUser ? 0 : 4,
                marginRight: isUser ? 4 : 0,
                textTransform: 'uppercase'
              }}>
                {isUser ? 'YOU' : isSystem ? 'SYSTEM' : 'AGENT'}
              </span>

              {/* Message Bubble */}
              <div style={{
                maxWidth: isSystem ? '100%' : '85%',
                padding: '16px 20px',
                background: isUser ? '#f0f7ff' : 'var(--bg-secondary)',
                border: `1px solid ${isUser ? 'rgba(14,165,233,0.3)' : 'var(--border-subtle)'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                color: 'var(--text-primary)',
                borderRadius: 12,
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}>
                <SimpleMarkdown text={msg.content} />

                {msg.subAgentHires && msg.subAgentHires.length > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#f8f9fa',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div className="brutal-text" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        A2A Economy Loop Visualized
                      </div>
                      <button
                        onClick={() => {
                          alert('Topology snapshot copied to clipboard for X sharing! 🚀');
                        }}
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

                {msg.cost && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--accent-warning)',
                    fontSize: '0.75rem'
                  }} className="mono">
                    <DollarSign size={12} />
                    <span>COST: {msg.cost} sBTC</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeholder}
          disabled={isProcessing}
          className="mono"
          style={{
            width: '100%',
            background: '#f8f9fa',
            border: '1px solid #e5e7eb',
            color: '#111827',
            padding: '16px 20px',
            paddingRight: 60,
            fontSize: '1rem',
            borderRadius: 12,
            outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
        />
        <button
          type="submit"
          disabled={!query.trim() || isProcessing}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: query.trim() && !isProcessing ? '#FF854B' : '#d1d5db',
            border: 'none',
            color: '#fff',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            cursor: query.trim() && !isProcessing ? 'pointer' : 'default',
            boxShadow: query.trim() && !isProcessing ? '0 2px 6px rgba(14,165,233,0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {isProcessing ? <Loader2 size={20} className="spin" /> : <Send size={20} strokeWidth={3} />}
        </button>
      </form>

      {/* ── Status Bar ── */}
      {isProcessing && (
         <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--text-muted)',
            fontSize: '0.8rem'
         }} className="mono">
            <Activity size={14} className="spin" color="var(--accent-success)" />
            <span>{t.thinking}</span>
         </div>
      )}
    </div>
  );
}
