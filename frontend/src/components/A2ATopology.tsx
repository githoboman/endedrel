import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Cpu, ArrowRight } from 'lucide-react';

interface AgentHire {
  agent: string;
  cost: number;
  currency?: string;
  subAgentHires?: AgentHire[];
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  label: string;
  cost: number;
  currency: string;
  depth: number;
}

interface Link {
  src: string;
  target: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_HEIGHT = 120;
const LEVEL_GAP = 200;

export const A2ATopology = ({ hires }: { hires: AgentHire[] }) => {
  const nodes: NodePosition[] = [];
  const links: Link[] = [];

  const layout = (data: AgentHire[], xStart: number, yStart: number, depth: number, parentId: string | null) => {
    data.forEach((hire, idx) => {
      const id = `${parentId || 'root'}-${hire.agent}-${idx}`;
      const x = xStart + idx * LEVEL_GAP;
      const y = yStart + depth * LEVEL_HEIGHT;

      nodes.push({
        id,
        x,
        y,
        label: hire.agent,
        cost: hire.cost,
        currency: hire.currency || 'STX',
        depth
      });

      if (parentId) {
        links.push({ src: parentId, target: id });
      }

      if (hire.subAgentHires && hire.subAgentHires.length > 0) {
        layout(hire.subAgentHires, x, yStart, depth + 1, id);
      }
    });
  };

  layout(hires, 100, 50, 0, null);

  const width = Math.max(...nodes.map(n => n.x)) + 200;
  const height = Math.max(...nodes.map(n => n.y)) + 150;

  return (
    <div className="topology-container" style={{
      overflowX: 'auto',
      background: 'rgba(0,0,0,0.4)',
      border: 'var(--border-2px)',
      boxShadow: 'var(--shadow-brutal)',
      padding: '20px',
      marginTop: '20px'
    }}>
      <div className="brutal-text" style={{ fontSize: '0.7rem', color: 'var(--accent-neon)', marginBottom: '15px' }}>
        Live Agent-to-Agent Economy Topology
      </div>

      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-neon)" />
          </marker>
        </defs>

        {/* Links with Money Pulses */}
        {links.map((link, i) => {
          const srcNode = nodes.find(n => n.id === link.src);
          const targetNode = nodes.find(n => n.id === link.target);
          if (!srcNode || !targetNode) return null;

          return (
            <g key={`link-${i}`}>
              <line
                x1={srcNode.x + NODE_WIDTH / 2}
                y1={srcNode.y + NODE_HEIGHT}
                x2={targetNode.x + NODE_WIDTH / 2}
                y2={targetNode.y}
                stroke="white"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <motion.circle
                r="4"
                fill="var(--accent-neon)"
                initial={{ offsetDistance: "0%" }}
                animate={{
                  cx: [srcNode.x + NODE_WIDTH / 2, targetNode.x + NODE_WIDTH / 2],
                  cy: [srcNode.y + NODE_HEIGHT, targetNode.y]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: node.depth * 0.2 }}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              fill="black"
              stroke={node.depth === 0 ? "var(--accent-500)" : "white"}
              strokeWidth="2"
            />
            <text
              x={node.x + 10}
              y={node.y + 25}
              fill="white"
              style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}
            >
              {node.label.toUpperCase()}
            </text>
            <text
              x={node.x + 10}
              y={node.y + 45}
              fill="var(--accent-neon)"
              style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            >
              {node.cost} {node.currency}
            </text>
            <rect
               x={node.x}
               y={node.y - 4}
               width={40}
               height={4}
               fill={node.depth === 0 ? "var(--accent-500)" : "var(--accent-neon)"}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
};
