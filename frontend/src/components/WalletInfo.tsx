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
  const shortAddr = (addr: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'not set');
  const [balance, setBalance] = useState<string>('—');

  useEffect(() => {
    // No address configured — nothing to query, don't touch the network.
    if (!SERVER_ADDRESS || !/^0x[0-9a-fA-F]{40}$/.test(SERVER_ADDRESS)) {
      setBalance('—');
      return;
    }
    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(RPC_URL, {
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
        // Network/RPC unreachable is expected in local/sim mode — show a dash,
        // never throw into render.
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 6,
        background: 'var(--accent-light, #fff1eb)',
        border: '1px solid var(--accent-500, #ff4f00)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-500, #ff4f00)',
          boxShadow: '0 0 6px var(--accent-500, #ff4f00)',
        }} />
        <span style={{ fontSize: '0.62rem', color: 'var(--accent-500, #ff4f00)', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          {NETWORK === 'mainnet' ? 'GOAT MAINNET' : 'GOAT TESTNET'}
        </span>
      </div>

      <div style={{
        padding: '5px 10px', borderRadius: 6,
        background: 'var(--bg-secondary, #f4f4f5)',
        border: '1px solid var(--border-subtle, #e4e4e7)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>Treasury</span>
        <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary, #52525b)' }}>{shortAddr(SERVER_ADDRESS)}</span>
        <span style={{ marginLeft: 6, color: 'var(--accent-500, #ff4f00)', fontWeight: 700, fontSize: '0.66rem' }}>
          {balance} BTC
        </span>
      </div>
    </div>
  );
}
