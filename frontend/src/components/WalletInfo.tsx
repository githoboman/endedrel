'use client';

import React, { useState, useEffect } from 'react';
import { getProvider, getConnectedChainId, supportedChains, defaultChain, switchNetwork } from '../lib/userSession';

// Public server address that receives payments (EVM, 0x...). Safe to expose.
const SERVER_ADDRESS = process.env.NEXT_PUBLIC_SERVER_ADDRESS || '';
const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_BOT_NETWORK || 'testnet') as 'testnet' | 'mainnet';
const DEFAULT_RPC_URL =
  DEFAULT_NETWORK === 'mainnet'
    ? 'https://rpc.botchain.ai'
    : 'https://rpc.bohr.life';

export default function WalletInfo() {
  const shortAddr = (addr: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'not set');
  const [balance, setBalance] = useState<string>('—');
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    // Check wallet network
    const checkNetwork = async () => {
      const id = await getConnectedChainId();
      setChainId(id);
    };

    checkNetwork();
    const provider = getProvider();
    if (provider?.on) {
      provider.on('chainChanged', () => {
        checkNetwork();
      });
    }

    // Balance check
    if (!SERVER_ADDRESS || !/^0x[0-9a-fA-F]{40}$/.test(SERVER_ADDRESS)) {
      setBalance('—');
      return;
    }
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        // Use default RPC for treasury balance since treasury is always BOT
        const res = await fetch(DEFAULT_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [SERVER_ADDRESS, 'latest'] }),
          signal: controller.signal,
        }).finally(() => clearTimeout(id));

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const hex = typeof data?.result === 'string' && data.result.startsWith('0x') ? data.result : '0x0';
        const btc = Number(BigInt(hex)) / 1e18;
        if (!cancelled) setBalance(Number.isFinite(btc) ? btc.toFixed(4) : '—');
      } catch {
        if (!cancelled) setBalance('—');
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeChain = supportedChains.find(c => c.id === chainId) || defaultChain;
  
  const isGoat = activeChain.name.toLowerCase().includes('goat');
  const badgeColor = isGoat ? '#8b5cf6' : '#ff4f00';
  const badgeBg = isGoat ? '#f3e8ff' : '#fff1eb';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <select 
        value={activeChain.id}
        onChange={(e) => switchNetwork(Number(e.target.value))}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          background: badgeBg,
          border: `1px solid ${badgeColor}`,
          color: badgeColor,
          fontSize: '0.62rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {supportedChains.map(chain => (
          <option key={chain.id} value={chain.id}>
            {chain.name.toUpperCase()}
          </option>
        ))}
      </select>

      <div style={{
        padding: '5px 10px', borderRadius: 6,
        background: 'var(--bg-secondary, #f4f4f5)',
        border: '1px solid var(--border-subtle, #e4e4e7)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>Treasury (BOT)</span>
        <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary, #52525b)' }}>{shortAddr(SERVER_ADDRESS)}</span>
        <span style={{ marginLeft: 6, color: 'var(--accent-500, #ff4f00)', fontWeight: 700, fontSize: '0.66rem' }}>
          {balance} BOT
        </span>
      </div>
    </div>
  );
}
