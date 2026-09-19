import React from 'react';
import { botTestnet, goatTestnet } from '@/lib/userSession';

export default function NetworkSelectModal({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (chainId: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      padding: '20px'
    }}>
      <div 
        className="neo-glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: 'var(--text-tertiary)'
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Select Network</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Which economy do you want to interact with? This will prompt your wallet to switch networks.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => {
              onSelect(botTestnet.id);
            }}
            style={{
              padding: '20px',
              background: '#fff1eb',
              border: '2px solid #ff4f00',
              color: '#ff4f00',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '1.1rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(255, 79, 0, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 79, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 79, 0, 0.15)';
            }}
          >
            BOT CHAIN
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255, 79, 0, 0.8)' }}>
              x402 Agent Economy (BOT)
            </span>
          </button>

          <button 
            onClick={() => {
              onSelect(goatTestnet.id);
            }}
            style={{
              padding: '20px',
              background: '#f3e8ff',
              border: '2px solid #8b5cf6',
              color: '#8b5cf6',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '1.1rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)';
            }}
          >
            GOAT NETWORK
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(139, 92, 246, 0.8)' }}>
              Bitcoin-Secured (BTC)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
