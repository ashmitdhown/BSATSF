import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import toast from 'react-hot-toast';

// 1. Define the Asset Type
export interface Asset {
  id: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  type: 'ERC721' | 'ERC1155';
  totalSupply?: string;
  uri: string;
}

// 2. Define the Context Interface
interface Web3ContextType {
  account: string | null;
  accounts: string[];
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  balanceEth?: string;

  // New properties
  assets: Asset[];
  isLoadingAssets: boolean;
  loadAssets: () => Promise<void>;

  refreshBalance?: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  switchAccount: (accountAddress: string) => Promise<void>;
}

// Minimal ABI for fetching assets
const MINIMAL_ABI = [
  "function getAllAssets() view returns (tuple(uint256 id, address owner, string uri, tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator) metadata)[])",
  "function getAllAssets() view returns (tuple(uint256 id, tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator, uint256 maxSupply) metadata, uint256 totalSupply, string uri)[])"
];

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const SEPOLIA_CHAIN_ID = '0xaa36a7';

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [balanceEth, setBalanceEth] = useState<string>('0');

  // State for Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const getIpfsUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  };

  // --- Load Assets Function ---
  const loadAssets = async () => {
    if (!provider) return;

    const erc721Address = process.env.REACT_APP_ERC721_ADDRESS;
    const erc1155Address = process.env.REACT_APP_ERC1155_ADDRESS;

    if (!erc721Address && !erc1155Address) return;

    setIsLoadingAssets(true);
    let allAssets: Asset[] = [];

    try {
      // Fetch ERC721
      if (erc721Address) {
        const contract721 = new ethers.Contract(erc721Address, MINIMAL_ABI, provider);
        try {
          const data721 = await contract721.getAllAssets();
          const formatted721 = data721.map((item: any) => ({
            id: item.id.toString(),
            owner: item.owner,
            uri: item.uri,
            name: item.metadata.name,
            description: item.metadata.description,
            image: getIpfsUrl(item.metadata.ipfsHash),
            type: 'ERC721'
          }));
          allAssets = [...allAssets, ...formatted721];
        } catch (err) {
          console.error("Error fetching ERC721:", err);
        }
      }

      // Fetch ERC1155
      if (erc1155Address) {
        const ABI_1155 = [
          "function getAllAssets() view returns (tuple(uint256 id, tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator, uint256 maxSupply) metadata, uint256 totalSupply, string uri)[])"
        ];

        const contract1155 = new ethers.Contract(erc1155Address, ABI_1155, provider);
        try {
          const data1155 = await contract1155.getAllAssets();
          const formatted1155 = data1155.map((item: any) => ({
            id: item.id.toString(),
            owner: 'Multi-Owner',
            totalSupply: item.totalSupply.toString(),
            uri: item.uri,
            name: item.metadata.name,
            description: item.metadata.description,
            image: getIpfsUrl(item.metadata.ipfsHash),
            type: 'ERC1155'
          }));
          allAssets = [...allAssets, ...formatted1155];
        } catch (err) {
          console.error("Error fetching ERC1155:", err);
        }
      }

      setAssets(allAssets);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const checkNetwork = async (provider: ethers.BrowserProvider) => {
    try {
      const network = await provider.getNetwork();
      const expected = BigInt(
        (process.env.REACT_APP_CHAIN_ID || '11155111').toString()
      );
      const isCorrect = network.chainId === expected;
      setIsCorrectNetwork(isCorrect);
      return isCorrect;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  };

  // This runs ONCE when the app loads. It checks if MetaMask is already connected.
  useEffect(() => {
    const checkExistingConnection = async () => {
      const ethereum = await detectEthereumProvider();
      if (ethereum) {
        try {
          // eth_accounts returns the array of accounts IF permission was already granted.
          // It does NOT trigger a popup if not connected.
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });

          if (accounts.length > 0) {
            console.log("Restoring connection...", accounts[0]);
            const web3Provider = new ethers.BrowserProvider(ethereum as any);
            const web3Signer = await web3Provider.getSigner();

            setProvider(web3Provider);
            setSigner(web3Signer);
            setAccount(accounts[0]);
            setAccounts(accounts);
            setIsConnected(true);

            // Check Network & Balance immediately
            checkNetwork(web3Provider);
            web3Provider.getBalance(accounts[0]).then(b =>
              setBalanceEth(ethers.formatEther(b))
            ).catch(() => { });
          }
        } catch (error) {
          console.error("Auto-connect failed", error);
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Handles account switching or network switching in the MetaMask extension
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          disconnectWallet();
        } else {
          // If user switches account, reload the page to ensure clean state
          window.location.reload();
        }
      };

      const handleChainChanged = () => {
        // Recommended by MetaMask: reload page on chain change
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider]); // Re-bind if provider changes

  const connectWallet = async () => {
    try {
      const ethereum = await detectEthereumProvider();
      if (!ethereum) {
        toast.error('MetaMask not detected.');
        return;
      }

      const web3Provider = new ethers.BrowserProvider(ethereum as any);
      await (window as any).ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });

      const accountsList = await (window as any).ethereum.request({
        method: "eth_requestAccounts"
      });

      if (accountsList.length === 0) {
        toast.error("No account selected.");
        return;
      }

      const web3Signer = await web3Provider.getSigner(accountsList[0]);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accountsList[0]);
      setAccounts(accountsList);
      setIsConnected(true);

      try {
        const bal = await web3Provider.getBalance(accountsList[0]);
        setBalanceEth(ethers.formatEther(bal));
      } catch { }

      const networkCorrect = await checkNetwork(web3Provider);
      if (!networkCorrect) {
        toast.error(`Please switch to Sepolia`);
      } else {
        toast.success(`Wallet connected!`);
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setAccounts([]);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setAssets([]);
    toast.success('Wallet disconnected');
  };

  const refreshBalance = async () => {
    try {
      if (provider && account) {
        const bal = await provider.getBalance(account);
        setBalanceEth(ethers.formatEther(bal));
      }
    } catch { }
  };

  const switchAccount = async (accountAddress: string) => {
    try {
      if (!provider || !accounts.includes(accountAddress)) {
        toast.error('Invalid account');
        return;
      }
      await (window as any).ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      const newSigner = await provider.getSigner(accountAddress);
      setSigner(newSigner);
      setAccount(accountAddress);
      toast.success(`Switched account`);
    } catch (error) {
      toast.error('Failed to switch account');
    }
  };

  const switchToSepolia = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      if (provider) {
        await checkNetwork(provider);
        toast.success('Switched to Sepolia');
      }
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } catch (addError) {
          toast.error('Failed to add Sepolia network');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  useEffect(() => {
    if (provider && isCorrectNetwork) {
      loadAssets();
    }
  }, [provider, isCorrectNetwork, account]);

  // 3. PASS THE DATA INTO THE PROVIDER
  return (
    <Web3Context.Provider
      value={{
        account,
        accounts,
        provider,
        signer,
        isConnected,
        isCorrectNetwork,
        balanceEth,

        assets,
        isLoadingAssets,
        loadAssets,

        refreshBalance,
        connectWallet,
        disconnectWallet,
        switchToSepolia,
        switchAccount,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}