import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

/**
 * BOT Chain is a high-performance EVM-compatible Layer 1.
 * Chain params verified against dev-docs.botchain.ai
 *   Mainnet:  chainId 677,  https://rpc.botchain.ai
 *   Testnet:  chainId 968,  https://rpc.bohr.life
 * Native currency is BOT; contract settlement is in USDC (see .env).
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
    botTestnet: {
      url: process.env.BOT_TESTNET_RPC || "https://rpc.bohr.life",
      chainId: 968,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    botMainnet: {
      url: process.env.BOT_MAINNET_RPC || "https://rpc.botchain.ai",
      chainId: 677,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  // Blockscout explorers (no API key required for verification).
  etherscan: {
    apiKey: {
      botTestnet: "empty",
      botMainnet: "empty",
    },
    customChains: [
      {
        network: "botTestnet",
        chainId: 968,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
      {
        network: "botMainnet",
        chainId: 677,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
    ],
  },
};

export default config;
