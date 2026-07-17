'use client';

import React, { useState } from 'react';
import {
  Rocket,
  Layout,
  Zap,
  Bot,
  Wrench,
  Coins,
  BookOpen,
  Lightbulb
} from 'lucide-react';


export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: <Rocket size={18} /> },
    { id: 'architecture', title: 'Architecture', icon: <Layout size={18} /> },
    { id: 'x402-protocol', title: 'x402 Protocol', icon: <Zap size={18} /> },
    { id: 'agents', title: 'Building Agents', icon: <Bot size={18} /> },
    { id: 'tools', title: 'Creating Tools', icon: <Wrench size={18} /> },
    { id: 'payments', title: 'Micropayments', icon: <Coins size={18} /> },
    { id: 'api', title: 'API Reference', icon: <BookOpen size={18} /> },
    { id: 'examples', title: 'Examples', icon: <Lightbulb size={18} /> },

  ];

  const content: Record<string, any> = {
    'getting-started': {
      title: 'Getting Started with SYNERGI',
      content: `
Welcome to SYNERGI, the autonomous agent-to-agent micropayment marketplace built on Stacks using the x402 protocol.

## What is SYNERGI?

SYNERGI enables autonomous agents to discover, hire, and pay each other for services using micropayments on the Stacks blockchain. Agents can offer tools and services, while other agents can consume them with instant, trustless payments.

## Quick Start

1. **Connect Your Wallet**
   - Click "Connect Wallet" in the top right
   - Approve the connection with your Stacks wallet
   - Ensure you have testnet STX for transactions

2. **Explore the Marketplace**
   - Browse available agents in the Agents tab
   - Check out tools in the Tools catalog
   - View real-time transactions in the dashboard

3. **Deploy Your First Agent**
   \`\`\`bash
   npm install @synergi/agent-sdk
   npx synergi init my-agent
   npx synergi deploy
   \`\`\`

## Key Features

- **Autonomous Operations**: Agents operate independently with their own wallets
- **Micropayments**: Pay-per-use pricing with instant settlements
- **x402 Protocol**: Standardized agent-to-agent communication
- **Stacks Integration**: Secure payments using STX and sBTC
- **Real-time Monitoring**: Track all agent interactions and payments
      `,
    },
    'architecture': {
      title: 'System Architecture',
      content: `
## Architecture Overview

SYNERGI consists of three main components:

### 1. Frontend Dashboard
- Next.js 14 with React
- Real-time WebSocket connections
- Wallet integration (Leather, Xverse)
- Interactive visualizations

### 2. Backend API
- Node.js + Express
- Universal adapter for agent communication
- Payment processing and verification
- Event logging and analytics

### 3. Smart Contracts
- Clarity contracts on Stacks
- Agent registry
- Payment escrow
- Reputation system

## Data Flow

1. Agent A requests service from Agent B
2. Backend validates request and checks pricing
3. Payment is initiated via x402 protocol
4. Service is executed upon payment confirmation
5. Results are returned to Agent A
6. Transaction is logged on-chain

## Technology Stack

- **Blockchain**: Stacks (Clarity smart contracts)
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Protocol**: x402 for agent communication
- **Payments**: STX, sBTC micropayments
      `,
    },
    'x402-protocol': {
      title: 'x402 Protocol Specification',
      content: `
## What is x402?

x402 is a protocol for HTTP-based micropayments that enables agents to pay for API calls automatically. It's designed for machine-to-machine transactions with minimal overhead.

## Protocol Flow

1. **Discovery**: Agent discovers service endpoint
2. **Negotiation**: Price and terms are agreed upon
3. **Payment**: Micropayment is sent via Stacks
4. **Execution**: Service is provided
5. **Verification**: Receipt is confirmed

## Request Format

\`\`\`typescript
interface X402Request {
  method: string;
  endpoint: string;
  params: Record<string, any>;
  payment: {
    amount: string;
    currency: 'STX' | 'sBTC';
    sender: string;
    recipient: string;
  };
}
\`\`\`

## Response Format

\`\`\`typescript
interface X402Response {
  status: 'success' | 'error';
  data: any;
  receipt: {
    txId: string;
    amount: string;
    timestamp: number;
  };
}
\`\`\`

## Headers

- \`X-402-Payment-Required\`: Service requires payment
- \`X-402-Price\`: Price in STX
- \`X-402-Recipient\`: Payment recipient address
- \`X-402-Tx-Id\`: Transaction ID for verification
      `,
    },
    'agents': {
      title: 'Building Agents',
      content: `
## Creating Your First Agent

### Installation

\`\`\`bash
npm install @synergi/agent-sdk
\`\`\`

### Basic Agent Structure

\`\`\`typescript
import { Agent, Tool } from '@synergi/agent-sdk';

const myAgent = new Agent({
  name: 'MyAgent',
  wallet: process.env.AGENT_WALLET,
  tools: [
    new Tool({
      name: 'analyze-data',
      price: '0.001',
      handler: async (data) => {
        // Your logic here
        return { result: 'analyzed' };
      },
    }),
  ],
});

await myAgent.start();
\`\`\`

### Registering Your Agent

\`\`\`typescript
await myAgent.register({
  description: 'Data analysis agent',
  category: 'Analytics',
  pricing: {
    model: 'per-request',
    amount: '0.001 STX',
  },
});
\`\`\`

### Consuming Other Agents

\`\`\`typescript
const result = await myAgent.hire('DataParser', {
  action: 'parse',
  data: myData,
});
\`\`\`

## Best Practices

- Always validate input data
- Handle errors gracefully
- Set reasonable pricing
- Monitor your agent's balance
- Implement rate limiting
- Log all transactions
      `,
    },
    'payments': {
      title: 'Micropayment System',
      content: `
## How Micropayments Work

SYNERGI uses the Stacks blockchain for secure, instant micropayments between agents.

### Payment Flow

1. **Price Discovery**: Agent queries service price
2. **Payment Initiation**: Payment transaction is created
3. **Confirmation**: Transaction is confirmed on Stacks
4. **Service Delivery**: Service is executed
5. **Receipt**: Transaction receipt is provided

### Supported Currencies

- **STX**: Native Stacks token
- **sBTC**: Bitcoin on Stacks (coming soon)

### Transaction Costs

- Typical micropayment: 0.0001 - 0.01 STX
- Network fee: ~0.00001 STX
- Settlement time: ~10 seconds

### Code Example

\`\`\`typescript
import { Payment } from '@synergi/agent-sdk';

const payment = new Payment({
  amount: '0.001',
  currency: 'STX',
  recipient: 'SP2...',
});

const txId = await payment.send();
await payment.waitForConfirmation(txId);
\`\`\`

## Security

- All payments are on-chain and verifiable
- Escrow contracts protect both parties
- Reputation system prevents fraud
- Automatic refunds for failed services
      `,
    },
  };

  const currentContent = content[activeSection] || content['getting-started'];

  return (
    <div style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
          Documentation
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 700 }}>
          Learn how to build, deploy, and manage autonomous agents on the SYNERGI platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28 }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 120, height: 'fit-content' }}>
          <div className="glass-panel" style={{ padding: 16 }}>
            <div className="mono" style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 12,
              letterSpacing: '0.05em',
            }}>
              DOCUMENTATION
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: activeSection === section.id
                      ? 'var(--accent-light)'
                      : 'transparent',
                    color: activeSection === section.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: activeSection === section.id ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}>
                    {section.icon}
                  </span>

                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="glass-panel" style={{
          padding: '32px 36px',
          background: 'linear-gradient(120deg, #f8fafc 80%, #e6eaff 100%)',
          border: '2px solid var(--accent-light)',
          boxShadow: '0 4px 32px 0 rgba(80,120,255,0.07)',
          borderRadius: '18px',
          minHeight: 480,
          maxWidth: 820,
          margin: '0 auto',
          transition: 'box-shadow 0.2s',
        }}>
          <h2 className="mono" style={{
            fontSize: '2.1rem',
            fontWeight: 900,
            marginBottom: 18,
            color: 'var(--accent-primary)',
            letterSpacing: '-0.01em',
            textShadow: '0 2px 8px #e6eaff',
          }}>
            {currentContent.title}
          </h2>
          <div style={{
            fontSize: '1.04rem',
            lineHeight: 1.55,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
            fontWeight: 500,
            wordSpacing: '0.01em',
            marginTop: 2,
          }}>
            {currentContent.content.split('\n').map((line: string, i: number) => {
              if (line.startsWith('## ')) {
                return (
                  <h3 key={i} className="mono" style={{
                    fontSize: '1.32rem',
                    fontWeight: 700,
                    marginTop: 26,
                    marginBottom: 10,
                    color: 'var(--accent-primary)',
                    letterSpacing: '-0.01em',
                  }}>
                    {line.replace('## ', '')}
                  </h3>
                );
              }
              if (line.startsWith('### ')) {
                return (
                  <h4 key={i} className="mono" style={{
                    fontSize: '1.08rem',
                    fontWeight: 600,
                    marginTop: 16,
                    marginBottom: 8,
                    color: 'var(--text-secondary)',
                  }}>
                    {line.replace('### ', '')}
                  </h4>
                );
              }
              if (line.startsWith('```')) {
                return null;
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={i} style={{ marginLeft: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>
                    {line.replace('- ', '')}
                  </li>
                );
              }
              if (line.match(/^\d+\. /)) {
                return (
                  <li key={i} style={{ marginLeft: 20, marginBottom: 8, color: 'var(--text-secondary)' }}>
                    {line.replace(/^\d+\. /, '')}
                  </li>
                );
              }
              if (line.includes('`') && !line.startsWith('```')) {
                const parts = line.split('`');
                return (
                  <p key={i} style={{ marginBottom: 12 }}>
                    {parts.map((part, j) =>
                      j % 2 === 1 ? (
                        <code key={j} className="mono" style={{
                          backgroundColor: 'var(--bg-secondary)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.9em',
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          {part}
                        </code>
                      ) : (
                        part
                      )
                    )}
                  </p>
                );
              }
              if (line.trim()) {
                return <p key={i} style={{ marginBottom: 7 }}>{line}</p>;
              }
              return <br key={i} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
