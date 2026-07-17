import { Cloud, FileText, Divide, Smile, Terminal, Search, Globe, Database, ShieldCheck, Zap, Cpu, type LucideIcon } from 'lucide-react';

export const AgentIconMap: Record<string, LucideIcon> = {
  weather: Cloud,
  summarize: FileText,
  'math-solve': Divide,
  sentiment: Smile,
  'code-explain': Terminal,
  research: Search,
  translate: Globe,
  kaggleingest: Database,
  arbitrator: ShieldCheck,
  manager: Cpu,
  'code-agent': Terminal,
};

export const getAgentIcon = (id: string): LucideIcon => {
  const baseId = id.toLowerCase();
  return AgentIconMap[baseId] || Zap;
};

export const AgentColors: Record<string, string> = {
  weather: '#22d3ee', // Cyan
  summarize: '#ef4444', // Red (Primary)
  'math-solve': '#10b981', // green
  sentiment: '#a855f7', // purple
  'code-explain': '#ef4444',
  research: '#22d3ee',
  translate: '#10b981',
  kaggleingest: '#a855f7',
  arbitrator: '#10b981',
  manager: '#ef4444',
  'code-agent': '#ef4444',
};

export const getAgentColor = (id: string) => {
  const baseId = id.toLowerCase();
  return AgentColors[baseId] || '#64748b'; // muted
};
