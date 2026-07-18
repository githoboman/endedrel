import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

/**
 * GOAT Network is a Bitcoin-secured, EVM-compatible L2.
 * Chain params verified against docs.goat.network/docs/build/networks-rpc.
 *   Mainnet (Alpha):  chainId 2345,  https://rpc.goat.network
 *   Testnet3:         chainId 48816, https://rpc.testnet3.goat.network
 * Native currency is BTC; contract settlement is in USDC (see .env).
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./src",
  },
  networks: {
    goatTestnet: {
      url: process.env.GOAT_TESTNET_RPC || "https://rpc.testnet3.goat.network",
      chainId: 48816,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    goatMainnet: {
      url: process.env.GOAT_MAINNET_RPC || "https://rpc.goat.network",
      chainId: 2345,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  // Blockscout explorers (no API key required for verification).
  etherscan: {
    apiKey: {
      goatTestnet: "empty",
      goatMainnet: "empty",
    },
    customChains: [
      {
        network: "goatTestnet",
        chainId: 48816,
        urls: {
          apiURL: "https://explorer.testnet3.goat.network/api",
          browserURL: "https://explorer.testnet3.goat.network",
        },
      },
      {
        network: "goatMainnet",
        chainId: 2345,
        urls: {
          apiURL: "https://explorer.goat.network/api",
          browserURL: "https://explorer.goat.network",
        },
      },
    ],
  },
};

export default config;
