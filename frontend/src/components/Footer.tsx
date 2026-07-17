'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Send } from 'lucide-react';

export default function Footer() {
  const productLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Agents', path: '/agents' },
    { name: 'Tools', path: '/tools' },
    { name: 'Marketplace', path: '/tools' },
    { name: 'Analytics', path: '#' },
  ];

  const resourceLinks = [
    { name: 'Documentation', path: '/docs' },
    { name: 'API Reference', path: 'https://docs.stacks.co' },
    { name: 'Tutorials', path: '#' },
    { name: 'Community', path: 'https://discord.gg/stacks' },
    { name: 'Support', path: 'mailto:support@synergi.ai' },
  ];

  return (
    <footer style={{
      marginTop: 80,
      borderTop: 'var(--border-width) solid var(--border-strong)',
      background: 'var(--bg-secondary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent Line */}
      <div style={{
        height: 4,
        background: 'var(--accent-500)',
        borderBottom: 'var(--border-width) solid var(--border-strong)',
      }} />

      <div className="footer-grid">
        {/* Brand Column */}
        <div className="brand-col">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <img
                src="/logo.png"
                alt="SYNERGI"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  border: 'var(--border-width) solid var(--border-strong)',
                  background: 'white'
                }}
              />
              <span className="mono" style={{
                fontWeight: 900,
                fontSize: '1.4rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.04em',
                textTransform: 'uppercase'
              }}>
                SYNERGI
              </span>
            </div>
          </Link>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 24,
            maxWidth: '300px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
          }}>
            The autonomous layer for the agent economy. Secure, trustless A2A micropayments on Stacks.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { icon: Github, href: 'https://github.com/Mansi2007275/x402-autonomous-agent-?tab=readme-ov-file' },
              { icon: Twitter, href: 'https://twitter.com/synergi' },
              { icon: Send, href: 'https://t.me/synergi' }
            ].map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-button"
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div className="nav-col">
          <h4 className="mono section-title">PRODUCT</h4>
          <div className="links">
            {productLinks.map((link) => (
              <Link key={link.name} href={link.path} className="link">
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources Column */}
        <div className="nav-col">
          <h4 className="mono section-title">RESOURCES</h4>
          <div className="links">
            {resourceLinks.map((link) => (link.path.startsWith('/') ? (
              <Link key={link.name} href={link.path} className="link">
                {link.name}
              </Link>
            ) : (
              <a key={link.name} href={link.path} className="link" target="_blank" rel="noopener noreferrer">
                {link.name}
              </a>
            )))}
          </div>
        </div>

        {/* Network Stats Column */}
        <div className="network-col">
          <h4 className="mono section-title">NETWORK STATUS</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat-card">
              <span className="label mono">PROTOCOL</span>
              <span className="value mono">x402</span>
            </div>
            <div className="stat-card">
              <span className="label mono">CHAIN</span>
              <span className="value mono">Stacks L2</span>
            </div>
            <div className="stat-card live">
              <span className="label mono">SYSTEM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="pulse-dot" />
                <span className="value mono" style={{ color: 'var(--success)' }}>OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="mono copyright">
          &copy; 2026 SYNERGI_PROTOCOL. ALL RIGHTS RESERVED.
        </div>
        <div className="bottom-links">
          <Link href="/privacy" className="mono bottom-link">PRIVACY</Link>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <Link href="/terms" className="mono bottom-link">TERMS</Link>
        </div>
      </div>

      <style jsx>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
          gap: 64px;
          padding: 56px 48px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 0.85rem;
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #111111;
          border-left: 4px solid var(--accent-500);
          padding-left: 12px;
        }

        .links {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .link {
          font-size: 0.9rem;
          color: #111111;
          text-decoration: none;
          transition: all 0.1s ease;
          font-weight: 600;
          position: relative;
          width: fit-content;
          font-family: var(--font-mono);
        }

        .link:hover {
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .link::before {
          content: '>';
          position: absolute;
          left: -12px;
          opacity: 0;
          transition: all 0.1s ease;
          color: var(--accent-500);
          font-weight: 800;
        }

        .link:hover::before {
          opacity: 1;
          left: -16px;
        }

        .social-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: var(--border-width) solid var(--border-strong);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          transition: all 0.1s ease;
          text-decoration: none;
          box-shadow: var(--shadow-sm);
        }

        .social-button:hover {
          background: var(--accent-500);
          color: #ffffff;
          border-color: var(--border-strong);
          transform: translate(-2px, -2px);
          box-shadow: var(--shadow-md);
        }

        .stat-card {
          background: #ffffff;
          border: var(--border-width) solid var(--border-strong);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.1s ease;
          box-shadow: var(--shadow-sm);
        }

        .stat-card:hover {
          transform: translate(-2px, -2px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent-500);
        }

        .stat-card .label {
          font-size: 0.7rem;
          color: #111111;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .stat-card .value {
          font-size: 0.85rem;
          color: #111111;
          font-weight: 700;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--success);
          border: 1px solid var(--border-strong);
          border-radius: 50%;
          animation: pulse-green 1.5s infinite;
        }

        @keyframes pulse-green {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 1; }
        }

        .footer-bottom {
          padding: 24px 48px;
          border-top: var(--border-width) solid var(--border-strong);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-primary);
        }

        .bottom-links {
          display: flex;
          gap: 32px;
        }

        .bottom-link {
          font-size: 0.75rem;
          color: #111111;
          text-decoration: none;
          transition: color 0.1s ease;
          font-weight: 700;
        }

        .bottom-link:hover {
          color: var(--accent-500);
          text-decoration: underline;
          text-decoration-thickness: 2px;
        }

        .copyright {
          font-size: 0.75rem;
          color: #111111;
          font-weight: 700;
        }

        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            padding: 48px 32px;
          }
        }

        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr;
            padding: 32px 16px;
          }

          .footer-bottom {
            flex-direction: column;
            gap: 20px;
            padding: 24px 8px;
            text-align: center;
          }

          .bottom-links {
            justify-content: center;
          }
        }

        @media (max-width: 400px) {
          .footer-grid {
            padding-left: 4px;
            padding-right: 4px;
          }
        }
      `}</style>
    </footer>
  );
}
