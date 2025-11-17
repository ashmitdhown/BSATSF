import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import toast from 'react-hot-toast';

interface Web3ContextType {
  account: string | null;
  accounts: string[];
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  balanceEth?: string;
  refreshBalance?: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  switchAccount: (accountAddress: string) => Promise<void>;
}

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

  const connectWallet = async () => {
    try {
      console.log('Attempting to connect wallet...');
      const ethereum = await detectEthereumProvider();
      
      if (!ethereum) {
        console.error('MetaMask not detected');
        toast.error('MetaMask not detected. Please install MetaMask.');
        return;
      }

      console.log('MetaMask detected, requesting accounts...');
      const web3Provider = new ethers.BrowserProvider(ethereum as any);
      const accountsList = await web3Provider.send('eth_requestAccounts', []);
      
      console.log('Accounts received:', accountsList);
      
      if (accountsList.length > 0) {
        const web3Signer = await web3Provider.getSigner();
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accountsList[0]);
        setAccounts(accountsList);
        setIsConnected(true);
        if (accountsList[0]) {
          try {
            const bal = await web3Provider.getBalance(accountsList[0]);
            setBalanceEth(ethers.formatEther(bal));
          } catch {}
        }
        
        console.log('Wallet connected, checking network...');
        const networkCorrect = await checkNetwork(web3Provider);
        if (!networkCorrect) {
          const targetName = (process.env.REACT_APP_NETWORK_NAME || 'target network').toString();
          toast.error(`Please switch to ${targetName}`);
        } else {
          toast.success(`Wallet connected! ${accountsList.length} account(s) available`);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else if (error.code === -32002) {
        toast.error('Connection request already pending. Please check MetaMask.');
      } else {
        toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setAccounts([]);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    toast.success('Wallet disconnected');
  };

  const refreshBalance = async () => {
    try {
      if (provider && account) {
        const bal = await provider.getBalance(account);
        setBalanceEth(ethers.formatEther(bal));
      }
    } catch {}
  };

  const switchAccount = async (accountAddress: string) => {
    try {
      if (!provider || !accounts.includes(accountAddress)) {
        toast.error('Invalid account or not connected');
        return;
      }

      // Request MetaMask to switch to the specific account
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      // Get new signer for the selected account
      const newSigner = await provider.getSigner(accountAddress);
      setSigner(newSigner);
      setAccount(accountAddress);
      
      toast.success(`Switched to account: ${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`);
    } catch (error: any) {
      console.error('Error switching account:', error);
      toast.error('Failed to switch account');
    }
  };

  const switchToSepolia = async () => {
    try {
      const ethereum = window.ethereum;
      if (!ethereum) return;

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      
      if (provider) {
        await checkNetwork(provider);
        toast.success('Switched to Sepolia testnet');
      }
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [
                process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
              ],
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
    const handleAccountsChanged = (newAccounts: string[]) => {
      if (newAccounts.length === 0) {
        disconnectWallet();
      } else {
        setAccounts(newAccounts);
        setAccount(newAccounts[0]);
        if (provider) {
          provider.getBalance(newAccounts[0]).then(b => setBalanceEth(ethers.formatEther(b))).catch(() => {});
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

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
