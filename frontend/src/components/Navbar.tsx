'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletInfo from './WalletInfo';
import ConnectWalletButton from './ConnectWalletButton';
import { useI18n } from '@/lib/LanguageContext';
import ThemeToggle from './ThemeToggle';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002').replace(/\/$/, '');

type BackendMode = 'live' | 'simulation' | 'offline' | 'checking';

export default function Navbar() {
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [backendMode, setBackendMode] = useState<BackendMode>('checking');

  // ── Poll backend health/mode every 15 seconds ──
  useEffect(() => {
    let cancelled = false;

    const checkMode = async () => {
      try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) });
        if (cancelled) return;
        if (!res.ok) { setBackendMode('offline'); return; }
        const json = await res.json().catch(() => ({}));
        // The backend exposes { BOTCredentials: boolean } or similar
        const hasCredentials = json.BOTCredentials === true || json.mode === 'live';
        setBackendMode(hasCredentials ? 'live' : 'simulation');
      } catch {
        if (!cancelled) setBackendMode('offline');
      }
    };

    checkMode();
    const interval = setInterval(checkMode, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: t.dashboard, path: '/app' },
    { name: t.agents, path: '/agents' },
    { name: t.tools, path: '/tools' },
    { name: t.docs, path: '/docs' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Mode badge config
  const modeBadge = {
    live: {
      dot: '#28c840',
      bg: 'rgba(40,200,64,0.08)',
      border: 'rgba(40,200,64,0.35)',
      text: '#28c840',
      label: 'LIVE · BOT',
    },
    simulation: {
      dot: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.35)',
      text: '#d97706',
      label: 'SIM MODE',
    },
    offline: {
      dot: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      border: 'rgba(220,38,38,0.3)',
      text: '#dc2626',
      label: 'OFFLINE',
    },
    checking: {
      dot: '#9ca3af',
      bg: 'rgba(156,163,175,0.08)',
      border: 'rgba(156,163,175,0.2)',
      text: '#9ca3af',
      label: '...',
    },
  }[backendMode];

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border-subtle)',
      marginBottom: 32,
      position: 'sticky',
      top: 0,
      backgroundColor: 'var(--surface)',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {/* ── Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Link href="/">
            <img
              src="/logo.png"
              alt="Endedrel Logo"
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid var(--border-subtle)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          </Link>
          <div style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 10,
            height: 10,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#FF854B',
            border: '2px solid #fff',
            boxShadow: '0 0 6px rgba(255,133,75,0.4)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
        <div>
          <div className="mono" style={{
            fontWeight: 800,
            fontSize: '1.4rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            Endedrel
            <span style={{
              color: '#FF854B',
              fontSize: '0.62rem',
              fontWeight: 600,
              padding: '2px 7px',
              backgroundColor: 'rgba(255,133,75,0.08)',
              border: '1px solid rgba(255,133,75,0.25)',
              borderRadius: 'var(--radius-sm)',
            }}>
              v2.0
            </span>
          </div>
          <div className="mono" style={{
            fontSize: '0.62rem',
            color: 'var(--text-secondary)',
            marginTop: 3,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {t.subtitle}
          </div>
        </div>
      </div>

      {/* ── Desktop Navigation ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }} className="desktop-nav">
        <div style={{ display: 'flex', gap: 2 }}>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.2s ease',
                backgroundColor: isActive(item.path) ? 'var(--surface-muted)' : 'transparent',
                border: isActive(item.path) ? '1px solid var(--border-strong)' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* ── Mode Badge (always visible) ── */}
        <div
          title={backendMode === 'simulation'
            ? 'Running in Simulation Mode — no BOT x402 credentials set'
            : backendMode === 'live'
              ? 'Connected to BOT Network with live x402 payments'
              : backendMode === 'offline'
                ? 'Backend is offline — start with: cd backend && npm run dev'
                : 'Checking backend connection...'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            background: modeBadge.bg,
            border: `1px solid ${modeBadge.border}`,
            borderRadius: 'var(--radius-sm)',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <span style={{
            width: 7, height: 7,
            borderRadius: 'var(--radius-sm)',
            background: modeBadge.dot,
            boxShadow: backendMode !== 'checking' && backendMode !== 'offline'
              ? `0 0 6px ${modeBadge.dot}`
              : 'none',
            animation: backendMode === 'checking' ? 'glowPulse 1.2s ease-in-out infinite' : undefined,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: modeBadge.text,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {modeBadge.label}
          </span>
        </div>

        {/* ── Language switcher ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <div style={{ display: 'flex', gap: 3, borderRight: '1px solid var(--border-strong)', paddingRight: 12 }}>
            {(['en', 'hi', 'es'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '4px 7px', fontSize: '0.62rem', fontWeight: language === lang ? 700 : 400,
                  background: language === lang ? 'var(--surface-muted)' : 'transparent',
                  color: language === lang ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  border: '1px solid', borderColor: language === lang ? 'var(--border-strong)' : 'transparent',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  transition: 'all 0.15s ease',
                }}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'ES'}
              </button>
            ))}
          </div>
        </div>

        <WalletInfo />
        <div style={{ width: 1, height: 22, background: 'var(--border-strong)' }} />
        <ConnectWalletButton />
      </nav>

      {/* ── Mobile Hamburger ── */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          flexDirection: 'column',
          gap: 5,
          padding: 10,
          background: 'transparent',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 22,
            height: 2,
            backgroundColor: '#374151',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.3s ease',
            transform: i === 0 && mobileMenuOpen ? 'rotate(45deg) translateY(7px)'
              : i === 2 && mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)'
                : 'none',
            opacity: i === 1 && mobileMenuOpen ? 0 : 1,
          }} />
        ))}
      </button>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--surface)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--border-strong)',
            borderTop: 'none',
            padding: 20,
            display: 'none',
            flexDirection: 'column',
            gap: 8,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {/* Mode badge in mobile menu too */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: modeBadge.bg,
            border: `1px solid ${modeBadge.border}`,
            borderRadius: 'var(--radius-sm)',
            marginBottom: 4,
            width: 'fit-content',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-sm)', background: modeBadge.dot }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: modeBadge.text, textTransform: 'uppercase' }}>
              {modeBadge.label}
            </span>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive(item.path) ? 'var(--surface-muted)' : 'transparent',
                border: isActive(item.path) ? '1px solid var(--border-strong)' : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {item.name}
            </Link>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <WalletInfo />
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .mobile-menu {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
