'use client';

import React from 'react';

interface StepData {
  label: string;
  detail: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface Props {
  steps: StepData[];
}

const STATUS_CONFIG = {
  pending:  { icon: '○', color: 'var(--text-muted)', bg: 'transparent' },
  active:   { icon: '◉', color: 'var(--accent-cyan)', bg: 'rgba(6,182,212,0.08)' },
  complete: { icon: '✓', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  error:    { icon: '✕', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
};

export default function ExecutionSteps({ steps }: Props) {
  if (!steps.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((step, i) => {
        const cfg = STATUS_CONFIG[step.status];
        return (
          <div
            key={`${step.label}-${i}`}
            className={step.status === 'active' ? 'fade-in' : ''}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              background: cfg.bg,
              border: step.status === 'active' ? '1px solid rgba(6,182,212,0.15)' : '1px solid transparent',
              transition: 'all 0.3s',
            }}
          >
            {/* Status icon */}
            <span style={{
              fontSize: '0.7rem', color: cfg.color,
              fontWeight: 700, minWidth: 14, textAlign: 'center',
              marginTop: 1,
            }}>
              {step.status === 'active' ? (
                <span className="spinner" style={{ width: 12, height: 12, display: 'inline-block' }} />
              ) : cfg.icon}
            </span>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: step.status === 'complete' ? '#10b981' : step.status === 'active' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}>
                {step.label}
              </div>
              {step.detail && (
                <div style={{
                  fontSize: '0.6rem', color: 'var(--text-muted)',
                  marginTop: 1, lineHeight: 1.3,
                }}>
                  {step.detail}
                </div>
              )}
            </div>

            {/* Step number */}
            <span style={{
              fontSize: '0.55rem', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', marginTop: 2,
            }}>
              {i + 1}/{steps.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}
