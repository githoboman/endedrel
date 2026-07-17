import React, { useState, useEffect } from 'react';
import { Globe, Box } from 'lucide-react';
import { getAgentIcon, getAgentColor } from './AgentIcons';
import { useI18n } from '@/lib/LanguageContext';

interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  token: string;
  canHireSubAgents: boolean;
  reputation: number; // 0-100
  isExternal?: boolean;
  mcpCompatible?: boolean;
}

export default function ToolCatalog() {
  const { t } = useI18n();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'https://synergi.onrender.com').replace(/\/$/, '')}/api/tools`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          price: t.price?.STX || 0,
          token: 'STX',
          canHireSubAgents: t.canHireSubAgents,
          reputation: t.reputation || 95,
          isExternal: t.isExternal,
          mcpCompatible: t.mcpCompatible
        }));
        setTools(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tools", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="mono" style={{ padding: 20 }}>{t.loadingAgents}</div>;

  return (
    <div style={{
      marginTop: 24,
      padding: 24,
      border: 'var(--border-width) solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-secondary)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 className="mono" style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Box size={20} /> {t.availableAgents}
        </h3>
        <div className="badge badge-stx">
           <Globe size={12} style={{ marginRight: 6 }} />
           {t.globalNetwork}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
        className="tool-grid-responsive"
      >
        {tools.map(tool => (
          <AgentCard key={tool.id} tool={tool} />
        ))}
      </div>
      <style jsx>{`
        @media (max-width: 480px) {
          .tool-grid-responsive {
            grid-template-columns: 1fr !important;
            padding-left: 8px;
            padding-right: 8px;
          }
        }
      `}</style>
    </div>
  );
}

function AgentCard({ tool }: { tool: Tool }) {

  const Icon = getAgentIcon(tool.id);
  const color = getAgentColor(tool.id);

  return (
    <div
      className="agent-card"
      style={{
        background: 'var(--bg-primary)',
        border: 'var(--border-width) solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.1s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)'
      }}
      onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            background: `${color}15`,
            border: `var(--border-width) solid ${color}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0 0 rgba(0,0,0,0.1)',
            color: 'var(--text-primary)'
          }}>
            {/* eslint-disable-next-line */}
            <Icon size={24} color={color} strokeWidth={2.5} />
          </div>
           <div>
             <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#111111' }}>{tool.name}</h4>
             <span className="mono" style={{ fontSize: '0.7rem', color: '#111111', fontWeight: 600 }}>{tool.category}</span>
           </div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#111111', lineHeight: 1.5, marginBottom: 20, flex: 1, fontWeight: 500 }}>
        {tool.description}
      </p>

      <div style={{
        paddingTop: 16,
        borderTop: '1px dashed var(--border-strong)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {tool.mcpCompatible && (
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              background: 'var(--info)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)'
            }}>
              MCP
            </div>
          )}
          {tool.canHireSubAgents && (
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              background: 'var(--accent-500)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)'
            }}>
              A2A
            </div>
          )}
        </div>

          <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111111' }}>
            {Number(tool.price) > 0 ? `${tool.price} ${tool.token}` : 'FREE'}
          </div>
      </div>
    </div>
  );
}
