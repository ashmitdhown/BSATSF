require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    sepolia: {
      // Support multiple RPC providers (drpc, Infura, Alchemy, or public endpoints)
      url: process.env.SEPOLIA_RPC_URL ||
           (process.env.DRPC_API_KEY ? `https://lb.drpc.live/sepolia/${process.env.DRPC_API_KEY}` : null) ||
           (process.env.REACT_APP_INFURA_PROJECT_ID ? `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_PROJECT_ID}` : null) ||
           (process.env.ALCHEMY_API_KEY ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : null) ||
           'https://rpc.sepolia.org',
      accounts: (() => {
        const pk = (process.env.PRIVATE_KEY || '').trim();
        const hex = pk.startsWith('0x') ? pk.slice(2) : pk;
        if (/^[0-9a-fA-F]{64}$/.test(hex)) {
          return [`0x${hex}`];
        }
        return [];
      })(),
      chainId: 11155111
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
