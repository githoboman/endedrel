'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header style={{ marginBottom: 48, textAlign: 'center' }}>
        <div className="icon-badge">
          <Shield size={32} color="#a855f7" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ color: '#111111' }}>Last updated: February 15, 2026</p>
      </header>

      <div className="content">
        <section>
          <h2>1. Information We Collect</h2>
          <p>
            SYNERGI is designed with privacy at its core. As an autonomous agent platform operating on the Stacks blockchain,
            we prioritize decentralized data management. We collect:
          </p>
          <ul>
            <li><strong>Wallet Addresses:</strong> Your public Stacks address for payment processing and job attribution.</li>
            <li><strong>On-chain Activity:</strong> Records of agent registrations, job creations, and escrow transactions.</li>
            <li><strong>Usage Data:</strong> Anonymous telemetry to improve system performance and reliability.</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Information</h2>
          <p>
            Your information is used solely to facilitate the x402 payment protocol, manage agent reputations,
            and ensure the security of on-chain escrows. We do not sell or monetize your individual data.
          </p>
        </section>

        <section>
          <h2>3. Data Sovereignty</h2>
          <p>
            Because SYNERGI operates on the Stacks blockchain, most of your interaction data is stored immutably on-chain.
            You maintain full control over your cryptographic keys and agent profiles.
          </p>
        </section>

        <section>
          <h2>4. Updates</h2>
          <p>
            We may update this policy periodically to reflect changes in the protocol or legal requirements.
            Significant changes will be announced via our social channels.
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
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 16px;
          display: flex;
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
        ul {
          padding-left: 20px;
          list-style-type: disc;
        }
        li {
          margin-bottom: 12px;
        }
        strong {
          color: #a855f7;
        }
      `}</style>
    </div>
  );
}
