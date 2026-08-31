'use client';

/**
 * EVM wallet session for BOT Chain (injected provider, e.g. MetaMask).
 *
 * Replaces the previous connection flow. Uses the EIP-1193 provider
 * exposed at window.ethereum and viem for chain helpers. No React context
 * provider is required for the injected flow.
 *
 * BOT Chain params (dev-docs.botchain.ai):
 *   testnet: chainId 968, rpc https://rpc.bohr.life
 *   mainnet: chainId 677, rpc https://rpc.botchain.ai
 */
import { defineChain } from 'viem';

const NETWORK = (process.env.NEXT_PUBLIC_BOT_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export const botTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'tBOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.botchain.ai' },
  },
  testnet: true,
});

export const botMainnet = defineChain({
  id: 677,
  name: 'BOT Chain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.botchain.ai'] } },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.botchain.ai' },
  },
});

export const activeChain = NETWORK === 'mainnet' ? botMainnet : botTestnet;

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

export function isWalletAvailable(): boolean {
  return getProvider() !== null;
}

const toHexChainId = (id: number) => `0x${id.toString(16)}`;

/** Ensure the wallet is on the active BOT chain; add it if unknown. */
async function ensureBotChain(provider: Eip1193Provider): Promise<void> {
  const hexId = toHexChainId(activeChain.id);
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  } catch (err: unknown) {
    // 4902 = chain not added to the wallet yet.
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexId,
          chainName: activeChain.name,
          nativeCurrency: activeChain.nativeCurrency,
          rpcUrls: activeChain.rpcUrls.default.http,
          blockExplorerUrls: [activeChain.blockExplorers!.default.url],
        }],
      });
    } else {
      throw err;
    }
  }
}

/** Prompt connection, switch to BOT, return the connected address. */
export async function authenticate(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) {
    alert('No EVM wallet found. Install MetaMask or another injected wallet to connect.');
    return null;
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) return null;
  await ensureBotChain(provider);
  return accounts[0];
}

/** Return the current connected address without prompting, if any. */
export async function getConnectedAddress(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) return null;
  const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
  return accounts?.[0] ?? null;
}

/**
 * There is no injected-wallet "sign out"; wallets manage their own
 * connection state. This clears any app-side cached address.
 */
export function sign_out(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('endedrel_wallet_address');
  }
}
