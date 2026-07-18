'use client';

import React, { useState, useEffect } from 'react';

// Public server address that receives payments (EVM, 0x...). Safe to expose.
const SERVER_ADDRESS = process.env.NEXT_PUBLIC_SERVER_ADDRESS || '';
const NETWORK = (process.env.NEXT_PUBLIC_GOAT_NETWORK || 'testnet') as 'testnet' | 'mainnet';
const RPC_URL =
  NETWORK === 'mainnet'
    ? 'https://rpc.goat.network'
    : 'https://rpc.testnet3.goat.network';

export default function WalletInfo() {
  const shortAddr = (addr: string) => (addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '—');
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!SERVER_ADDRESS) {
      setBalance('---');
      return;
    }
    const fetchBalance = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      try {
        // Native BTC balance on GOAT via JSON-RPC eth_getBalance.
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBalance',
            params: [SERVER_ADDRESS, 'latest'],
          }),
          signal: controller.signal,
        });
        clearTimeout(id);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const wei = BigInt(data.result ?? '0x0'); // 18 decimals
        setBalance((Number(wei) / 1e18).toFixed(4));
      } catch {
        clearTimeout(id);
        setBalance('---');
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Network badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#FF854B',
          boxShadow: '0 0 6px rgba(255,133,75,0.6)',
        }} />
        <span style={{ fontSize: '0.6rem', color: '#FF854B', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {NETWORK === 'mainnet' ? 'GOAT MAINNET' : 'GOAT TESTNET'}
        </span>
      </div>

      {/* Server Address + native balance */}
      <div style={{
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: 1 }}>Server</div>
        <div style={{
          fontSize: '0.62rem', color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {shortAddr(SERVER_ADDRESS)}
          <span style={{ marginLeft: 6, color: 'var(--accent-primary)', fontWeight: 700 }}>
            {balance ? `${balance} BTC` : '...'}
          </span>
        </div>
      </div>
    </div>
  );
}
