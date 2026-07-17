'use client';

import React, { useState } from 'react';

export default function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Data', 'AI/ML', 'Blockchain', 'Media', 'Security', 'Utilities'];

  const tools = [
    {
      id: 1,
      name: 'Data Parser',
      category: 'Data',
      price: '0.0005 STX',
      calls: 5420,
      description: 'Parse and transform structured data formats',
      endpoint: '/api/parse',
    },
    {
      id: 2,
      name: 'Image Classifier',
      category: 'AI/ML',
      price: '0.002 STX',
      calls: 3210,
      description: 'Classify images using trained ML models',
      endpoint: '/api/classify',
    },
    {
      id: 3,
      name: 'Smart Contract Verifier',
      category: 'Blockchain',
      price: '0.003 STX',
      calls: 1890,
      description: 'Verify and audit smart contract code',
      endpoint: '/api/verify',
    },
    {
      id: 4,
      name: 'Video Transcoder',
      category: 'Media',
      price: '0.0015 STX',
      calls: 2340,
      description: 'Transcode video files to different formats',
      endpoint: '/api/transcode',
    },
    {
      id: 5,
      name: 'Sentiment Analyzer',
      category: 'AI/ML',
      price: '0.001 STX',
      calls: 4560,
      description: 'Analyze sentiment in text content',
      endpoint: '/api/sentiment',
    },
    {
      id: 6,
      name: 'Hash Generator',
      category: 'Security',
      price: '0.0003 STX',
      calls: 8920,
      description: 'Generate cryptographic hashes',
      endpoint: '/api/hash',
    },
    {
      id: 7,
      name: 'Token Metadata',
      category: 'Blockchain',
      price: '0.0008 STX',
      calls: 3450,
      description: 'Fetch and parse token metadata',
      endpoint: '/api/token-meta',
    },
    {
      id: 8,
      name: 'Text Summarizer',
      category: 'AI/ML',
      price: '0.0012 STX',
      calls: 2890,
      description: 'Generate concise summaries of long text',
      endpoint: '/api/summarize',
    },
    {
      id: 9,
      name: 'QR Code Generator',
      category: 'Utilities',
      price: '0.0002 STX',
      calls: 6780,
      description: 'Generate QR codes from data',
      endpoint: '/api/qr',
    },
  ];

  const filteredTools = selectedCategory === 'All'
    ? tools
    : tools.filter(tool => tool.category === selectedCategory);

  return (
    <div style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 className="mono" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12, color: '#000000' }}>
          Tool Catalog
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#333333', maxWidth: 700 }}>
          Browse and integrate powerful tools into your agents. Pay-per-use with instant x402 micropayments.
        </p>
      </div>

      {/* Category Filter */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 40,
        flexWrap: 'wrap',
      }}>
        {categories.map((category) => (
          <button
            key={category}
            className="mono"
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: selectedCategory === category
                ? '1px solid rgba(168, 85, 247, 0.4)'
                : '1px solid rgba(168, 85, 247, 0.2)',
              backgroundColor: selectedCategory === category
                ? 'rgba(168, 85, 247, 0.15)'
                : 'transparent',
              color: selectedCategory === category ? '#000000' : '#4b5563',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedCategory === category ? '2px 2px 0 0 rgba(168, 85, 247, 0.2)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.color = '#000000';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                e.currentTarget.style.color = '#4b5563';
              }
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tools List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className="glass-panel"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 24,
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h3 className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#000000' }}>
                  {tool.name}
                </h3>
                <span className="badge" style={{
                  backgroundColor: 'rgba(34, 211, 238, 0.15)',
                  color: '#22d3ee',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                }}>
                  {tool.category}
                </span>
              </div>
              <p style={{ fontSize: '0.95rem', color: '#333333', marginBottom: 12 }}>
                {tool.description}
              </p>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Endpoint: </span>
                  <code className="mono" style={{
                    fontSize: '0.85rem',
                    color: '#9333ea',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}>
                    {tool.endpoint}
                  </code>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Total calls: </span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: '#000000', fontWeight: 600 }}>
                    {tool.calls.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: 4 }}>Price per call</div>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
                  {tool.price}
                </div>
              </div>
              <button className="btn btn-primary" style={{ minWidth: 140 }}>
                Use Tool
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
