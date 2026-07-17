'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletInfo from './WalletInfo';
import ConnectWalletButton from './ConnectWalletButton';
import { useI18n } from '@/lib/LanguageContext';

export default function Navbar() {
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: t.dashboard, path: '/' },
    { name: t.agents, path: '/agents' },
    { name: t.tools, path: '/tools' },
    { name: t.docs, path: '/docs' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: 32,
      position: 'sticky',
      top: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Link href="/">
            <img
              src="/logo.png"
              alt="SYNERGI Logo"
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          </Link>
          <div style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#FF854B',
            border: '2px solid #fff',
            boxShadow: '0 0 6px rgba(255,133,75,0.4)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
        <div>
          <div className="mono" style={{
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#111827',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            SYNERGI
            <span style={{
              color: '#FF854B',
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '2px 8px',
              backgroundColor: 'rgba(255,133,75,0.08)',
              border: '1px solid rgba(255,133,75,0.25)',
              borderRadius: 4,
            }}>
              v2.0
            </span>
          </div>
          <div className="mono" style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            marginTop: 4,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {t.subtitle}
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}
      className="desktop-nav"
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isActive(item.path) ? '#111827' : '#6b7280',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                transition: 'all 0.2s ease',
                position: 'relative',
                backgroundColor: isActive(item.path) ? '#f0f2f5' : 'transparent',
                border: isActive(item.path) ? '1px solid #e5e7eb' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = '#111827';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginRight: 8, borderRight: '1px solid #e5e7eb', paddingRight: 12 }}>
          {(['en', 'hi', 'es'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: '4px 8px', fontSize: '0.65rem', fontWeight: language === lang ? 700 : 400,
                background: language === lang ? '#f0f2f5' : 'transparent',
                color: language === lang ? '#111827' : '#9ca3af',
                border: '1px solid', borderColor: language === lang ? '#e5e7eb' : 'transparent',
                borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-mono)'
              }}
            >
              {lang === 'en' ? 'EN' : lang === 'hi' ? '\u0939\u093f\u0928\u094d\u0926\u0940' : 'ES'}
            </button>
          ))}
        </div>
        <WalletInfo />
        <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 8px' }}></div>
        <ConnectWalletButton />
      </nav>

      {/* Mobile Hamburger */}
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
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: 22,
          height: 2,
          backgroundColor: '#374151',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
        }} />
        <div style={{
          width: 22,
          height: 2,
          backgroundColor: '#374151',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          opacity: mobileMenuOpen ? 0 : 1,
        }} />
        <div style={{
          width: 22,
          height: 2,
          backgroundColor: '#374151',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
        }} />
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            padding: 20,
            display: 'none',
            flexDirection: 'column',
            gap: 8,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="mono"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive(item.path) ? '#111827' : '#6b7280',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: isActive(item.path) ? '#f0f2f5' : 'transparent',
                border: isActive(item.path) ? '1px solid #e5e7eb' : '1px solid transparent',
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
