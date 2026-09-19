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

// Mainnet is the default: the production deployment lives on BOT Chain mainnet.
// Set NEXT_PUBLIC_BOT_NETWORK=testnet explicitly for local/testnet work.
const NETWORK = (process.env.NEXT_PUBLIC_BOT_NETWORK || 'mainnet') as 'testnet' | 'mainnet';

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

export const goatTestnet = defineChain({
  id: 248, // PLACEHOLDER for Testnet3
  name: 'GOAT Network Testnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.goat.network'] } },
  blockExplorers: {
    default: { name: 'GOATScan', url: 'https://explorer.testnet.goat.network' },
  },
  testnet: true,
});

export const goatMainnet = defineChain({
  id: 2345,
  name: 'GOAT Network',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.goat.network'] } },
  blockExplorers: {
    default: { name: 'GOATScan', url: 'https://explorer.goat.network' },
  },
});

export const supportedChains = [botMainnet, botTestnet, goatTestnet];
export const defaultChain = NETWORK === 'mainnet' ? botMainnet : botTestnet;

/** True when pointing at BOT Chain mainnet (real value). */
export const isMainnet = NETWORK === 'mainnet';

/**
 * Settlement token symbol for the active network. Mainnet settles in USDT —
 * the canonical stablecoin on BOT Chain (no official USDC exists there); the
 * testnet deployment uses a mock token labelled USDC. Import this instead of
 * hardcoding a symbol so the UI can never claim the wrong asset.
 */
export const SETTLEMENT_SYMBOL = isMainnet ? 'USDT' : 'USDC';

/** Short network label for badges, e.g. "Mainnet" / "Testnet". */
export const NETWORK_LABEL = isMainnet ? 'Mainnet' : 'Testnet';

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

export async function getConnectedChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) return null;
  try {
    const chainIdHex = (await provider.request({ method: 'eth_chainId' })) as string;
    return parseInt(chainIdHex, 16);
  } catch {
    return null;
  }
}

/** Ensure the wallet is on a supported chain; switch to default if unknown. */
async function ensureSupportedChain(provider: Eip1193Provider): Promise<void> {
  const currentId = await getConnectedChainId();
  if (currentId && supportedChains.some((c) => c.id === currentId)) {
    return; // Already on a supported chain
  }
  
  const hexId = toHexChainId(defaultChain.id);
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  } catch (err: unknown) {
    // 4902 = chain not added to the wallet yet.
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexId,
          chainName: defaultChain.name,
          nativeCurrency: defaultChain.nativeCurrency,
          rpcUrls: defaultChain.rpcUrls.default.http,
          blockExplorerUrls: [defaultChain.blockExplorers!.default.url],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function switchNetwork(chainId: number): Promise<void> {
  const provider = getProvider();
  if (!provider) return;
  const targetChain = supportedChains.find(c => c.id === chainId);
  if (!targetChain) return;

  const hexId = toHexChainId(targetChain.id);
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexId,
          chainName: targetChain.name,
          nativeCurrency: targetChain.nativeCurrency,
          rpcUrls: targetChain.rpcUrls.default.http,
          blockExplorerUrls: [targetChain.blockExplorers!.default.url],
        }],
      });
    } else {
      throw err;
    }
  }
}

/** Prompt connection, ensure valid chain, return the connected address. */
export async function authenticate(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) {
    alert('No EVM wallet found. Install MetaMask or another injected wallet to connect.');
    return null;
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) return null;
  await ensureSupportedChain(provider);
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
