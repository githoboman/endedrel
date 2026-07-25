import {
  Cloud, FileText, Divide, Smile, Terminal, Search, Globe, Database,
  ShieldCheck, Zap, Cpu, Scale, LineChart, Gavel, Languages,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon + accent per agent. Keys normalized so both the backend's camelCase ids
 * (mathSolve, codeExplain) and kebab endpoints (math-solve) resolve, plus the
 * external MCP agents (auditor-zero, market-oracle, legal-ai, kaggleingest*).
 */
const norm = (id: string) => id.toLowerCase().replace(/[_\s]+/g, '-');

export const AgentIconMap: Record<string, LucideIcon> = {
  weather: Cloud,
  summarize: FileText,
  'math-solve': Divide,
  mathsolve: Divide,
  sentiment: Smile,
  'code-explain': Terminal,
  codeexplain: Terminal,
  research: Search,
  'deepresearch': Search,
  translate: Languages,
  coding: Terminal,
  'code-agent': Terminal,
  autocoder: Terminal,
  kaggleingest: Database,
  'kaggleingest-data': Database,
  'kaggleingest-data-backup': Database,
  arbitrator: Gavel,
  manager: Cpu,
  'auditor-zero': ShieldCheck,
  'market-oracle': LineChart,
  'legal-ai': Scale,
};

/** Brand-disciplined accents: orange family + BTC + semantic, no rainbow. */
export const AgentColors: Record<string, string> = {
  weather: '#0ea5e9',        // sky (utility/data)
  summarize: '#ff4f00',      // accent
  'math-solve': '#059669',   // success (compute)
  mathsolve: '#059669',
  sentiment: '#f7931a',      // btc
  'code-explain': '#ff4f00',
  codeexplain: '#ff4f00',
  research: '#0ea5e9',
  deepresearch: '#0ea5e9',
  translate: '#059669',
  coding: '#ff4f00',
  'code-agent': '#ff4f00',
  autocoder: '#ff4f00',
  kaggleingest: '#f7931a',
  arbitrator: '#7c3aed',     // violet (governance)
  manager: '#ff4f00',
  'auditor-zero': '#7c3aed',
  'market-oracle': '#f7931a',
  'legal-ai': '#7c3aed',
};

export const getAgentIcon = (id: string): LucideIcon =>
  AgentIconMap[norm(id)] || AgentIconMap[id.toLowerCase()] || Zap;

export const getAgentColor = (id: string): string =>
  AgentColors[norm(id)] || AgentColors[id.toLowerCase()] || '#78716c';
