'use client';

/**
 * EVM wallet session for GOAT Network (injected provider, e.g. MetaMask).
 *
 * Replaces the previous @stacks/connect flow. Uses the EIP-1193 provider
 * exposed at window.ethereum and viem for chain helpers. No React context
 * provider is required for the injected flow.
 *
 * GOAT chain params (docs.goat.network/docs/build/networks-rpc):
 *   testnet3: chainId 48816, rpc https://rpc.testnet3.goat.network
 *   mainnet:  chainId 2345,  rpc https://rpc.goat.network
 */
import { defineChain } from 'viem';

const NETWORK = (process.env.NEXT_PUBLIC_GOAT_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export const goatTestnet = defineChain({
  id: 48816,
  name: 'GOAT Testnet3',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet3.goat.network'] } },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.testnet3.goat.network' },
  },
  testnet: true,
});

export const goatMainnet = defineChain({
  id: 2345,
  name: 'GOAT Network',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.goat.network'] } },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.goat.network' },
  },
});

export const activeChain = NETWORK === 'mainnet' ? goatMainnet : goatTestnet;

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

/** Ensure the wallet is on the active GOAT chain; add it if unknown. */
async function ensureGoatChain(provider: Eip1193Provider): Promise<void> {
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

/** Prompt connection, switch to GOAT, return the connected address. */
export async function authenticate(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) {
    alert('No EVM wallet found. Install MetaMask or another injected wallet to connect.');
    return null;
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) return null;
  await ensureGoatChain(provider);
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
