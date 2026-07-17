import axios from 'axios';

export interface AgentCard {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  protocol: 'x402-REST' | 'MCP-Connect';
  price: { amount: number; unit: string };
  reputation: number;
  category: string;
}

export const EXTERNAL_AGENTS: AgentCard[] = [
  {
    id: 'auditor-zero',
    name: 'Auditor Zero (Security)',
    description: 'Top-tier smart contract auditor — finds vulnerabilities in Clarity and Solidity',
    capabilities: ['smart-contract-audit', 'gas-optimization'],
    protocol: 'MCP-Connect',
    price: { amount: 0.05, unit: 'STX' },
    reputation: 98,
    category: 'audit'
  },
  {
    id: 'market-oracle',
    name: 'Market Oracle Pro',
    description: 'Real-time crypto market data, price feeds, and DeFi analytics',
    capabilities: ['price-feed', 'defi-analytics', 'market-data'],
    protocol: 'x402-REST',
    price: { amount: 0.01, unit: 'STX' },
    reputation: 95,
    category: 'finance'
  },
  {
    id: 'legal-ai',
    name: 'LegalMind AI',
    description: 'Smart contract legal compliance and regulatory analysis',
    capabilities: ['compliance-check', 'regulatory-analysis'],
    protocol: 'x402-REST',
    price: { amount: 0.04, unit: 'STX' },
    reputation: 90,
    category: 'legal'
  },
  {
    id: 'kaggleingest-data',
    name: 'KaggleIngest DataService',
    description: 'Dataset discovery, summarization, and quality flagging via KaggleIngest MCP bridge. Provides structured dataset metadata, quality scores, and AI-generated summaries for informed data sourcing decisions.',
    capabilities: ['dataset-search', 'data-summary', 'quality-flag', 'machine-learning'],
    protocol: 'MCP-Connect',
    price: { amount: 0.02, unit: 'STX' },
    reputation: 92,
    category: 'data'
  },
  {
    id: 'kaggleingest-data-backup',
    name: 'KaggleIngest Backup (Legacy)',
    description: 'Fallback dataset provider. Slower and more expensive, but reliable.',
    capabilities: ['dataset-search', 'data-summary'],
    protocol: 'MCP-Connect',
    price: { amount: 0.04, unit: 'STX' }, // Higher price
    reputation: 85, // Lower reputation
    category: 'data'
  },
];

/**
 * Call an external agent via its protocol.
 * In production: MCP-Connect -> gRPC/HTTP2, x402-REST -> standard HTTP+402 header
 */
export async function callExternalAgent(
  agentId: string,
  params: Record<string, any>
): Promise<{ result: any; cost: string; protocol: string }> {
  console.log(`[Adapter] Calling ${agentId} with params:`, JSON.stringify(params));
  const agent = EXTERNAL_AGENTS.find(a => a.id === agentId);
  if (!agent) throw new Error(`External agent not found: ${agentId}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  // Self-Healing Test Trigger
  if (params.query && params.query.includes('fail_me') && agentId === 'kaggleingest-data') {
    throw new Error('Simulated failure for self-healing test (Primary Agent Down)');
  }

  // KaggleIngest Integration (Primary & Backup)
  if (agentId.startsWith('kaggleingest-data')) {
    const targetUrl = params.url || (params.query ? `https://www.kaggle.com/search?q=${encodeURIComponent(params.query)}` : 'https://www.kaggle.com');

    try {
      const response = await axios.post('https://kaggleingest.onrender.com/get-context', {
        url: targetUrl,
        top_n: 5,
        output_format: 'toon'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10s timeout to allow self-healing if slow/down
      });

      return {
        result: response.data,
        cost: `${agent.price.amount} ${agent.price.unit}`,
        protocol: agent.protocol,
      };
    } catch (error: any) {
      console.error(`[Adapter] KaggleIngest Failed: ${error.message}`);
      throw new Error(`External Agent Failed: ${error.message}`);
    }
  }

  // Generic mock result for other agents
  const result = {
    agent: agent.name,
    protocol: agent.protocol,
    output: `[${agent.name}] Processed request with params: ${JSON.stringify(params)}`,
    timestamp: new Date().toISOString(),
  };

  return {
    result,
    cost: `${agent.price.amount} ${agent.price.unit}`,
    protocol: agent.protocol,
  };
}
