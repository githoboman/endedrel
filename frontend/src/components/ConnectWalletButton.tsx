'use client';

import React, { useEffect, useState } from 'react';
import { authenticate, userSession, sign_out } from '../lib/userSession';
import type { UserData } from '@stacks/connect';

export default function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (userSession.isUserSignedIn()) {
      setUser(userSession.loadUserData());
    }
  }, []);

  if (!mounted) return null;

  if (user && user.profile && user.profile.stxAddress) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
           padding: '8px 12px',
           borderRadius: 8,
           background: 'rgba(16,185,129,0.08)',
           border: '1px solid rgba(16,185,129,0.2)',
           color: '#059669',
           fontSize: '0.85rem',
           fontWeight: 600,
           fontFamily: 'var(--font-mono)',
        }}>
          {user.profile.stxAddress.testnet.slice(0, 6)}...{user.profile.stxAddress.testnet.slice(-4)}
        </div>
        <button
          onClick={() => {
            sign_out();
            window.location.reload();
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => authenticate()}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        background: '#111827',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 600,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      Connect Wallet
    </button>
  );
}
