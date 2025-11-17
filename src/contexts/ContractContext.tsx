import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './Web3Context';
import toast from 'react-hot-toast';

// Import contract ABIs (these will be generated after compilation)
// For now, we'll use placeholder interfaces
// ContractContextType interface (add marketplace APIs and fix return types for ethers v6)
interface ContractContextType {
  erc721Contract: ethers.Contract | null;
  erc1155Contract: ethers.Contract | null;
  contractAddresses: ContractAddresses | null;
  mintERC721Asset: (to: string, metadataURI: string, name: string, description: string, ipfsHash: string, priceEth?: string) => Promise<{ tokenId: number; tx: ethers.ContractTransactionResponse } | null>;
  mintERC1155Asset: (to: string, amount: number, name: string, description: string, ipfsHash: string, maxSupply: number) => Promise<ethers.ContractTransactionResponse | null>;
  transferERC721: (from: string, to: string, tokenId: number, feeAmount?: string) => Promise<ethers.ContractTransactionResponse | null>;
  getTransferFee: () => Promise<string | null>;
  getUserAssets: (address: string) => Promise<UserAssets>;
  getAssetMetadata: (tokenId: number, tokenType: 'ERC721' | 'ERC1155') => Promise<AssetMetadata | null>;
  // Added marketplace entries
  marketplaceContract: ethers.Contract | null;
  listERC721ForSale: (tokenId: number, priceEth: string) => Promise<ethers.TransactionReceipt>;
  buyERC721: (tokenId: number) => Promise<ethers.TransactionReceipt>;
  cancelERC721Listing: (tokenId: number) => Promise<ethers.TransactionReceipt>;
  getMarketplaceListings: () => Promise<Array<{ seller: string; tokenId: number; priceWei: string; priceEth: string; active: boolean }>>;
}

interface ContractAddresses {
  ERC721: string;
  ERC1155: string;
  network: string;
  chainId: number;
  Marketplace?: string; // Added optional Marketplace address
}

interface UserAssets {
  erc721Tokens: Array<{
    tokenId: number;
    metadata: AssetMetadata;
  }>;
  erc1155Tokens: Array<{
    tokenId: number;
    balance: number;
    metadata: AssetMetadata;
  }>;
}

interface AssetMetadata {
  name: string;
  description: string;
  ipfsHash: string;
  timestamp: number;
  creator: string;
  maxSupply?: number;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

// Placeholder ABIs - these will be replaced with actual ABIs after contract compilation
const ERC721_ABI = [
  "function mintAsset(address to, string metadataURI, string name, string description, string ipfsHash) returns (uint256)",
  "function transferAsset(address from, address to, uint256 tokenId) payable",
  "function approve(address to, uint256 tokenId)",
  "function getAssetMetadata(uint256 tokenId) view returns (tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator))",
  "function getTokensByOwner(address owner) view returns (uint256[])",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function transferFee() view returns (uint256)",
  "function setTransferFee(uint256 _fee)",
  "event AssetMinted(uint256 indexed tokenId, address indexed to, string metadataURI)",
  "event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 fee)",
  "event TransferFeeUpdated(uint256 newFee)"
];

const ERC1155_ABI = [
  "function mintAsset(address to, uint256 amount, string name, string description, string ipfsHash, uint256 maxSupply) returns (uint256)",
  "function getAssetMetadata(uint256 tokenId) view returns (tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator, uint256 maxSupply))",
  "function getTokensByOwner(address owner) view returns (uint256[], uint256[])",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function totalSupply(uint256 tokenId) view returns (uint256)",
  "event AssetMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string metadataURI)"
];

// Default contract addresses (will be updated after deployment)
const DEFAULT_ADDRESSES: ContractAddresses = {
  ERC721: "0x0000000000000000000000000000000000000000",
  ERC1155: "0x0000000000000000000000000000000000000000",
  network: "sepolia",
  chainId: 11155111
};

// In ContractProvider component
export function ContractProvider({ children }: { children: React.ReactNode }) {
  const { provider, signer, isConnected, isCorrectNetwork } = useWeb3();
  const [erc721Contract, setErc721Contract] = useState<ethers.Contract | null>(null);
  const [erc1155Contract, setErc1155Contract] = useState<ethers.Contract | null>(null);
  const [contractAddresses, setContractAddresses] = useState<ContractAddresses | null>(null);

  useEffect(() => {
    const initializeContracts = async () => {
      if (!provider || !signer || !isConnected || !isCorrectNetwork) {
        setErc721Contract(null);
        setErc1155Contract(null);
        return;
      }

      try {
        // Try to load contract addresses from file (generated after deployment)
        let addresses = DEFAULT_ADDRESSES;
        try {
          const response = await fetch('/contracts/addresses.json');
          if (response.ok) {
            addresses = await response.json();
          }
        } catch (error) {
          console.log('Contract addresses not found, using defaults');
        }

        // Env fallback for addresses
        const env721 = (process.env.REACT_APP_ERC721_ADDRESS || '').trim();
        const env1155 = (process.env.REACT_APP_ERC1155_ADDRESS || '').trim();
        const envMp = (process.env.REACT_APP_MARKETPLACE_ADDRESS || '').trim();
        if (env721) addresses.ERC721 = env721;
        if (env1155) addresses.ERC1155 = env1155;
        if (envMp) addresses.Marketplace = envMp as any;

        setContractAddresses(addresses);

        // Check if network matches the addresses file
        const network = await provider.getNetwork();
        const addressesChainId = addresses.chainId;
        const currentChainId = Number(network.chainId);
        const networkMatches = addressesChainId === currentChainId;

        if (!networkMatches && addressesChainId) {
          console.log(`Contract addresses are for chain ${addressesChainId} (${addresses.network || 'unknown'}), but you're connected to chain ${currentChainId}. Deploy contracts to the current network or switch networks.`);
        }

        // Initialize contracts if addresses are available
        const isZero = (addr: string) => addr.toLowerCase() === '0x0000000000000000000000000000000000000000';
        const looksLikeAddr = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

        if (looksLikeAddr(addresses.ERC721) && !isZero(addresses.ERC721)) {
          try {
            // Check if contract has code deployed
            const code = await provider.getCode(addresses.ERC721);
            if (code && code !== '0x') {
              const erc721 = new ethers.Contract(addresses.ERC721, ERC721_ABI, signer);
              setErc721Contract(erc721);
            } else if (networkMatches) {
              // Only warn if networks match (contract should be there)
              console.warn('ERC721 contract not deployed at address:', addresses.ERC721);
            }
          } catch (error) {
            console.error('Error checking ERC721 contract:', error);
          }
        }

        if (looksLikeAddr(addresses.ERC1155) && !isZero(addresses.ERC1155)) {
          try {
            // Check if contract has code deployed
            const code = await provider.getCode(addresses.ERC1155);
            if (code && code !== '0x') {
              const erc1155 = new ethers.Contract(addresses.ERC1155, ERC1155_ABI, signer);
              setErc1155Contract(erc1155);
            } else if (networkMatches) {
              // Only warn if networks match (contract should be there)
              console.warn('ERC1155 contract not deployed at address:', addresses.ERC1155);
            }
          } catch (error) {
            console.error('Error checking ERC1155 contract:', error);
          }
        }

      } catch (error) {
        console.error('Error initializing contracts:', error);
        toast.error('Failed to initialize smart contracts');
      }
    };

    initializeContracts();
  }, [provider, signer, isConnected, isCorrectNetwork]);

  const mintERC721Asset = async (
    to: string,
    metadataURI: string,
    name: string,
    description: string,
    ipfsHash: string,
    priceEth?: string
  ): Promise<{ tokenId: number; tx: ethers.ContractTransactionResponse } | null> => {
    if (!erc721Contract || !signer) {
      toast.error('ERC721 contract not available');
      return null;
    }

    try {
      const tx = await erc721Contract.mintAsset(to, metadataURI, name, description, ipfsHash);
      toast.success('Minting transaction submitted!');
      const receipt = await tx.wait();
      
      // Extract tokenId from the AssetMinted event
      let tokenId: number | null = null;
      if (receipt?.logs) {
        const iface = new ethers.Interface([
          "event AssetMinted(uint256 indexed tokenId, address indexed to, string metadataURI)"
        ]);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'AssetMinted') {
              tokenId = Number(parsed.args.tokenId);
              break;
            }
          } catch {}
        }
      }

      // If price provided and marketplace available, auto-list
      if (priceEth && priceEth !== '0' && Number(priceEth) > 0 && marketplaceContract && tokenId !== null && contractAddresses?.Marketplace) {
        try {
          // First approve marketplace
          const marketplaceAddress = contractAddresses.Marketplace;
          const approveTx = await erc721Contract.approve(marketplaceAddress, tokenId);
          await approveTx.wait();
          
          // Then list (use signer for marketplace)
          const priceWei = ethers.parseEther(priceEth);
          const listTx = await (marketplaceContract as any).connect(signer).list(tokenId, priceWei);
          await listTx.wait();
          toast.success(`Asset minted and listed for ${priceEth} ETH!`);
        } catch (listError: any) {
          console.error('Error auto-listing:', listError);
          toast.error(`Minted but listing failed: ${listError.message}`);
        }
      } else {
        toast.success('ERC-721 minted successfully!');
      }

      return { tokenId: tokenId || 0, tx: tx as ethers.ContractTransactionResponse };
    } catch (error: any) {
      console.error('Error minting ERC721 asset:', error);
      toast.error(`Minting failed: ${error.message}`);
      return null;
    }
  };

  const mintERC1155Asset = async (
    to: string,
    amount: number,
    name: string,
    description: string,
    ipfsHash: string,
    maxSupply: number
  ): Promise<ethers.ContractTransactionResponse | null> => {
    if (!erc1155Contract) {
      toast.error('ERC1155 contract not available');
      return null;
    }

    try {
      const tx = await erc1155Contract.mintAsset(to, amount, name, description, ipfsHash, maxSupply);
      toast.success('Minting transaction submitted!');
      return tx as ethers.ContractTransactionResponse;
    } catch (error: any) {
      console.error('Error minting ERC1155 asset:', error);
      toast.error(`Minting failed: ${error.message}`);
      return null;
    }
  };

  // transferERC721 function (fix value type for ethers v6 and optional fee handling)
  const transferERC721 = async (
    from: string,
    to: string,
    tokenId: number,
    feeAmountWei?: string
  ): Promise<ethers.ContractTransactionResponse | null> => {
    if (!erc721Contract) {
      toast.error('ERC721 contract not available');
      return null;
    }

    try {
      const fee: bigint = feeAmountWei ? BigInt(feeAmountWei) : await erc721Contract.transferFee();
      const tx = await erc721Contract.transferAsset(from, to, tokenId, {
        value: fee
      });
      toast.success('Transfer transaction submitted!');
      return tx as ethers.ContractTransactionResponse;
    } catch (error: any) {
      console.error('Error transferring asset:', error);
      toast.error(`Transfer failed: ${error.message}`);
      return null;
    }
  };

  const getTransferFee = async (): Promise<string | null> => {
    if (!erc721Contract) {
      return null;
    }

    try {
      const fee = await erc721Contract.transferFee();
      return fee.toString();
    } catch (error: any) {
      console.error('Error getting transfer fee:', error);
      return null;
    }
  };

  const getUserAssets = async (address: string): Promise<UserAssets> => {
    const result: UserAssets = {
      erc721Tokens: [],
      erc1155Tokens: []
    };

    try {
      // Get ERC721 tokens
      if (erc721Contract) {
        try {
          const erc721TokenIds = await erc721Contract.getTokensByOwner(address);
          if (erc721TokenIds && Array.isArray(erc721TokenIds) && erc721TokenIds.length > 0) {
            for (const tokenId of erc721TokenIds) {
              try {
                const metadata = await erc721Contract.getAssetMetadata(tokenId);
                result.erc721Tokens.push({
                  tokenId: Number(tokenId),
                  metadata: {
                    name: metadata.name,
                    description: metadata.description,
                    ipfsHash: metadata.ipfsHash,
                    timestamp: Number(metadata.timestamp),
                    creator: metadata.creator
                  }
                });
              } catch (error) {
                console.error(`Error fetching ERC721 metadata for token ${tokenId}:`, error);
              }
            }
          }
        } catch (error: any) {
          // Handle empty response or contract not deployed
          if (error.code !== 'BAD_DATA' && error.message && !error.message.includes('decode')) {
            console.error('Error fetching ERC721 tokens:', error);
          }
        }
      }

      // Get ERC1155 tokens
      if (erc1155Contract) {
        try {
          const tokensResult = await erc1155Contract.getTokensByOwner(address);
          if (tokensResult && Array.isArray(tokensResult) && tokensResult.length === 2) {
            const [tokenIds, balances] = tokensResult;
            if (tokenIds && Array.isArray(tokenIds) && tokenIds.length > 0) {
              for (let i = 0; i < tokenIds.length; i++) {
                try {
                  const metadata = await erc1155Contract.getAssetMetadata(tokenIds[i]);
                  result.erc1155Tokens.push({
                    tokenId: Number(tokenIds[i]),
                    balance: Number(balances[i]),
                    metadata: {
                      name: metadata.name,
                      description: metadata.description,
                      ipfsHash: metadata.ipfsHash,
                      timestamp: Number(metadata.timestamp),
                      creator: metadata.creator,
                      maxSupply: Number(metadata.maxSupply)
                    }
                  });
                } catch (error) {
                  console.error(`Error fetching ERC1155 metadata for token ${tokenIds[i]}:`, error);
                }
              }
            }
          }
        } catch (error: any) {
          // Handle empty response or contract not deployed
          if (error.code !== 'BAD_DATA' && error.message && !error.message.includes('decode')) {
            console.error('Error fetching ERC1155 tokens:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user assets:', error);
    }

    return result;
  };

  const getAssetMetadata = async (
    tokenId: number,
    tokenType: 'ERC721' | 'ERC1155'
  ): Promise<AssetMetadata | null> => {
    try {
      const contract = tokenType === 'ERC721' ? erc721Contract : erc1155Contract;
      if (!contract) return null;

      const metadata = await contract.getAssetMetadata(tokenId);
      return {
        name: metadata.name,
        description: metadata.description,
        ipfsHash: metadata.ipfsHash,
        timestamp: Number(metadata.timestamp),
        creator: metadata.creator,
        maxSupply: metadata.maxSupply ? Number(metadata.maxSupply) : undefined
      };
    } catch (error) {
      console.error('Error fetching asset metadata:', error);
      return null;
    }
  };

  const MARKETPLACE_ABI = [
    "function erc721() view returns (address)",
    "function list(uint256 tokenId, uint256 price) external",
    "function cancel(uint256 tokenId) external",
    "function purchase(uint256 tokenId) external payable",
    "function getListing(uint256 tokenId) external view returns (tuple(address seller, uint256 tokenId, uint256 price, bool active))",
    "function getActiveListings() external view returns (tuple(address seller, uint256 tokenId, uint256 price, bool active)[])",
    "event Listed(address indexed seller, uint256 indexed tokenId, uint256 price)",
    "event ListingCancelled(address indexed seller, uint256 indexed tokenId)",
    "event Purchased(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price, uint256 fee)"
  ];

  const [marketplaceContract, setMarketplaceContract] = React.useState<ethers.Contract | null>(null);

  React.useEffect(() => {
    if (provider) {
      const addresses = contractAddresses;
      const mpAddr =
        addresses?.Marketplace ||
        (process.env.REACT_APP_MARKETPLACE_ADDRESS || "").trim();

      if (mpAddr) {
        const mp = new ethers.Contract(mpAddr, MARKETPLACE_ABI, signer || provider);
        setMarketplaceContract(mp);
      }
    }
  }, [provider, signer, contractAddresses]);

  // listERC721ForSale and buyERC721 (use ethers.parseEther/formatEther and bigint arithmetic)
  const listERC721ForSale = async (tokenId: number, priceEth: string) => {
    if (!marketplaceContract || !signer) throw new Error("Marketplace not initialized");
    const priceWei = ethers.parseEther(priceEth);
    const tx = await (marketplaceContract as any).connect(signer).list(tokenId, priceWei);
    toast.loading("Listing asset for sale...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success(`Listed token #${tokenId} for ${priceEth} ETH`);
    return receipt;
  };

  const cancelERC721Listing = async (tokenId: number) => {
    if (!marketplaceContract || !signer) throw new Error("Marketplace not initialized");
    const tx = await (marketplaceContract as any).connect(signer).cancel(tokenId);
    toast.loading("Cancelling listing...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success(`Listing cancelled for token #${tokenId}`);
    return receipt;
  };
  
  const buyERC721 = async (tokenId: number) => {
    if (!marketplaceContract || !erc721Contract || !signer) throw new Error("Contracts not initialized");
  
    const listing = await marketplaceContract.getListing(tokenId);
    if (!listing.active) throw new Error("Listing is not active");
  
    const fee: bigint = await erc721Contract.transferFee();
    const value: bigint = (listing.price as bigint) + fee;
  
    const tx = await (marketplaceContract as any).connect(signer).purchase(tokenId, { value });
    toast.loading("Purchasing asset...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success(`Purchased token #${tokenId}`);
    return receipt;
  };

  // getMarketplaceListings (ensure ethers.formatEther is used on bigint)
  const getMarketplaceListings = async () => {
    if (!marketplaceContract) return [];
    try {
      const listings = await marketplaceContract.getActiveListings();
      if (listings && Array.isArray(listings) && listings.length > 0) {
        return listings.map((l: any) => ({
          seller: l.seller,
          tokenId: Number(l.tokenId),
          priceWei: l.price.toString(),
          priceEth: ethers.formatEther(l.price),
          active: l.active,
        }));
      }
      return [];
    } catch (error: any) {
      // Handle empty response or contract not deployed
      if (error.code !== 'BAD_DATA' && error.message && !error.message.includes('decode')) {
        console.error('Error fetching marketplace listings:', error);
      }
      return [];
    }
  };

  return (
    <ContractContext.Provider
      value={{
        erc721Contract,
        erc1155Contract,
        contractAddresses,
        mintERC721Asset,
        mintERC1155Asset,
        transferERC721,
        getTransferFee,
        getUserAssets,
        getAssetMetadata,
        // Marketplace additions
        marketplaceContract,
        listERC721ForSale,
        buyERC721,
        cancelERC721Listing,
        getMarketplaceListings,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error('useContracts must be used within a ContractProvider');
  }
  return context;
};
