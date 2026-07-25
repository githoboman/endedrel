'use client';

import React, { useEffect } from 'react';

/**
 * Route-level error boundary. Keeps a single failing client component (e.g. a
 * fetch to an unreachable backend/RPC) from white-screening the whole app,
 * and surfaces a readable message instead of "[object Object]".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Endedrel]', error);
  }, [error]);

  const message =
    (error && (error.message || (typeof error === 'string' ? error : ''))) ||
    'Something went wrong while loading the dashboard.';

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
      fontFamily: 'var(--font-mono, monospace)', padding: 40,
    }}>
      <div style={{
        fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'var(--accent-500, #ff4f00)', fontWeight: 700,
      }}>
        Runtime Fault
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, maxWidth: 520, color: 'var(--text-primary, #09090b)' }}>
        The dashboard hit an error
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #52525b)', maxWidth: 480, lineHeight: 1.6 }}>
        {message}
      </p>
      <button
        onClick={reset}
        style={{
          fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '0.85rem',
          padding: '10px 22px', cursor: 'pointer',
          background: 'var(--accent-500, #ff4f00)', color: '#fff',
          border: '2px solid var(--border-strong, #09090b)',
          boxShadow: '4px 4px 0 0 var(--border-strong, #09090b)',
        }}
      >
        Retry
      </button>
    </div>
  );
}
