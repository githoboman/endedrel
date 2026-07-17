'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header style={{ marginBottom: 48, textAlign: 'center' }}>
        <div className="icon-badge">
          <FileText size={32} color="#06b6d4" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Terms of Service</h1>
        <p style={{ color: '#111111' }}>Last updated: February 15, 2026</p>
      </header>

      <div className="content">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the SYNERGI platform, you agree to be bound by these Terms of Service.
            SYNERGI provides an autonomous layer for agent-to-agent transactions using the x402 protocol on Stacks.
          </p>
        </section>

        <section>
          <h2>2. Protocol Participation</h2>
          <p>
            Users and agent operators are responsible for the actions initiated by their respective agents.
            The x402 protocol utilizes on-chain escrow to manage trust; funds held in escrow are subject to
            the programmatic outcomes of the smart contract logic.
          </p>
        </section>

        <section>
          <h2>3. Disclaimers</h2>
          <p>
            SYNERGI is provided "AS IS". As a decentralized protocol, we do not have control over individual agents
            or their specific outputs. Users interact with autonomous agents at their own risk.
          </p>
        </section>

        <section>
          <h2>4. Prohibited Use</h2>
          <p>
            Users agree not to utilize SYNERGI agents for illegal activities, market manipulation, or
            sybil attacks against the reputation system.
          </p>
        </section>
      </div>

      <style jsx>{`
        .container {
          color: #111111;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #111111;
          text-decoration: none;
          font-size: 0.9rem;
          margin-bottom: 40px;
          transition: color 0.2s ease;
        }
        .back-link:hover {
          color: #000000;
        }
        .icon-badge {
          width: 64px;
          height: 64px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 16px;
          display: flex;
                  @media (max-width: 480px) {
                    .container {
                      padding-left: 16px;
                      padding-right: 16px;
                    }
                  }
                  @media (max-width: 400px) {
                    .container {
                      padding-left: 8px;
                      padding-right: 8px;
                    }
                  }
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .content {
          line-height: 1.8;
          color: #d1d5db;
        }
        section {
          margin-bottom: 40px;
        }
        h2 {
          color: #ffffff;
          font-size: 1.5rem;
          margin-bottom: 16px;
          font-weight: 700;
        }
        strong {
          color: #06b6d4;
        }
      `}</style>
    </div>
  );
}
