'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';

export default function LicensePage() {
  return (
    <div className="container" style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px' }}>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header style={{ marginBottom: 48, textAlign: 'center' }}>
        <div className="icon-badge">
          <Gavel size={32} color="#FF854B" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>License</h1>
        <p style={{ color: '#111111' }}>Effective Date: February 15, 2026</p>
      </header>

      <div className="content">
        <section>
          <h2>1. Open Source Foundation</h2>
          <p>
            SYNERGI is committed to the open-source ethos of the Stacks and Bitcoin communities.
            The core protocol and smart contracts are licensed under the <strong>MIT License</strong>.
          </p>
        </section>

        <section>
          <h2>2. Software License</h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
{`MIT License

Copyright (c) 2026 SYNERGI Protocol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
          </div>
        </section>

        <section>
          <h2>3. Agent Intellectual Property</h2>
          <p>
            While the SYNERGI framework is open source, individual agent operators may retain intellectual
            property rights over their specific model weights, proprietary tools, and underlying data sources.
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
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
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
          color: #FF854B;
        }
      `}</style>
    </div>
  );
}
