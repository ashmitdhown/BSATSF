import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './Web3Context';
import toast from 'react-hot-toast';

// --- Types ---

interface ContractAddresses {
  ERC721: string;
  ERC1155: string;
  network: string;
  chainId: number;
  Marketplace?: string;
}

interface AssetMetadata {
  name: string;
  description: string;
  ipfsHash: string;
  timestamp: number;
  creator: string;
  maxSupply?: number;
}

interface UserAssets {
  erc721Tokens: Array<{ tokenId: number; metadata: AssetMetadata }>;
  erc1155Tokens: Array<{ tokenId: number; balance: number; metadata: AssetMetadata }>;
}

export interface MarketplaceListing {
  listingId: number;
  seller: string;
  tokenAddress: string;
  tokenId: number;
  quantity: number;
  pricePerUnit: string; // Wei
  priceEth: string;     // Display
  isERC1155: boolean;
  active: boolean;
}

interface ContractContextType {
  erc721Contract: ethers.Contract | null;
  erc1155Contract: ethers.Contract | null;
  marketplaceContract: ethers.Contract | null;
  contractAddresses: ContractAddresses | null;

  // Asset Actions
  mintERC721Asset: (to: string, metadataURI: string, name: string, description: string, ipfsHash: string, priceEth?: string) => Promise<{ tokenId: number; tx: ethers.ContractTransactionResponse } | null>;
  mintERC1155Asset: (to: string, amount: number, name: string, description: string, ipfsHash: string, maxSupply: number) => Promise<ethers.ContractTransactionResponse | null>;
  transferERC721: (from: string, to: string, tokenId: number, feeAmount?: string) => Promise<ethers.ContractTransactionResponse | null>;
  
  // Helpers
  getTransferFee: () => Promise<string | null>;
  getUserAssets: (address: string) => Promise<UserAssets>;
  getAssetMetadata: (tokenId: number, tokenType: 'ERC721' | 'ERC1155') => Promise<AssetMetadata | null>;

  // Marketplace Actions
  listERC721ForSale: (tokenId: number, priceEth: string) => Promise<ethers.TransactionReceipt>;
  listERC1155ForSale: (tokenId: number, quantity: number, priceEth: string) => Promise<ethers.TransactionReceipt>;
  buyAsset: (listingId: number, quantity: number, totalPriceEth: string) => Promise<ethers.TransactionReceipt>;
  cancelListing: (listingId: number) => Promise<ethers.TransactionReceipt>;
  getMarketplaceListings: () => Promise<MarketplaceListing[]>;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

// --- ABIs (UPDATED) ---

const ERC721_ABI = [
  "function mintAsset(address to, string metadataURI, string name, string description, string ipfsHash) returns (uint256)",
  "function transferAsset(address from, address to, uint256 tokenId) payable",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function getAssetMetadata(uint256 tokenId) view returns (tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator))",
  "function getTokensByOwner(address owner) view returns (uint256[])",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFee() view returns (uint256)",
  "function getMyAssets() view returns (tuple(uint256 tokenId, address owner, string uri, tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator) metadata)[])",
  // ✅ ADDED MISSING FUNCTION
  "function tokenURI(uint256 tokenId) view returns (string)"
];

const ERC1155_ABI = [
  "function mintAsset(address to, uint256 amount, string name, string description, string ipfsHash, uint256 maxSupply) returns (uint256)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function getAssetMetadata(uint256 tokenId) view returns (tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator, uint256 maxSupply))",
  "function getTokensByOwner(address owner) view returns (uint256[], uint256[])",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function getMyAssets() view returns (tuple(uint256 id, tuple(string name, string description, string ipfsHash, uint256 timestamp, address creator, uint256 maxSupply) metadata, uint256 balance, string uri)[])",
  // ✅ ADDED MISSING FUNCTIONS
  "function uri(uint256 id) view returns (string)",
  "function totalSupply(uint256 id) view returns (uint256)"
];

const MARKETPLACE_ABI = [
  "function listERC721(uint256 tokenId, uint256 price) external",
  "function listERC1155(uint256 tokenId, uint256 quantity, uint256 pricePerUnit) external",
  "function buyItem(uint256 listingId, uint256 quantityToBuy) external payable",
  "function cancelListing(uint256 listingId) external",
  "function getAllActiveListings() view returns (tuple(uint256 listingId, address seller, address tokenAddress, uint256 tokenId, uint256 quantity, uint256 pricePerUnit, bool isERC1155, bool active)[])"
];

const DEFAULT_ADDRESSES: ContractAddresses = {
  ERC721: "0x0000000000000000000000000000000000000000",
  ERC1155: "0x0000000000000000000000000000000000000000",
  network: "sepolia",
  chainId: 11155111
};

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const { provider, signer, isConnected, isCorrectNetwork } = useWeb3();
  const [erc721Contract, setErc721Contract] = useState<ethers.Contract | null>(null);
  const [erc1155Contract, setErc1155Contract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [contractAddresses, setContractAddresses] = useState<ContractAddresses | null>(null);

  // 1. Initialize Contracts
  useEffect(() => {
    const initializeContracts = async () => {
      if (!provider || !signer || !isConnected || !isCorrectNetwork) {
        setErc721Contract(null); setErc1155Contract(null); setMarketplaceContract(null);
        return;
      }

      try {
        // Load addresses
        let addresses = DEFAULT_ADDRESSES;
        const env721 = process.env.REACT_APP_ERC721_ADDRESS;
        const env1155 = process.env.REACT_APP_ERC1155_ADDRESS;
        const envMp = process.env.REACT_APP_MARKETPLACE_ADDRESS;
        
        if (env721) addresses.ERC721 = env721;
        if (env1155) addresses.ERC1155 = env1155;
        if (envMp) addresses.Marketplace = envMp;
        
        setContractAddresses(addresses);

        // Instantiate
        if (addresses.ERC721) setErc721Contract(new ethers.Contract(addresses.ERC721, ERC721_ABI, signer));
        if (addresses.ERC1155) setErc1155Contract(new ethers.Contract(addresses.ERC1155, ERC1155_ABI, signer));
        if (addresses.Marketplace) setMarketplaceContract(new ethers.Contract(addresses.Marketplace, MARKETPLACE_ABI, signer));
        
      } catch (error) {
        console.error("Contract initialization failed", error);
        toast.error("Failed to load contracts");
      }
    };
    initializeContracts();
  }, [provider, signer, isConnected, isCorrectNetwork]);

  // --- MINTING LOGIC ---

  const mintERC721Asset = async (to: string, metadataURI: string, name: string, description: string, ipfsHash: string, priceEth?: string) => {
    if (!erc721Contract) return null;
    try {
      const tx = await erc721Contract.mintAsset(to, metadataURI, name, description, ipfsHash);
      toast.success("Minting submitted...");
      const receipt = await tx.wait();
      
      // Parse Token ID
      let tokenId = 0;
      if (receipt.logs) {
        const iface = new ethers.Interface(["event AssetMinted(uint256 indexed tokenId, address indexed to, string metadataURI)"]);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) tokenId = Number(parsed.args.tokenId);
          } catch {}
        }
      }

      // Auto-List if price provided
      if (priceEth && tokenId > 0 && marketplaceContract && contractAddresses?.Marketplace) {
          await listERC721ForSale(tokenId, priceEth);
      }
      
      return { tokenId, tx };
    } catch (e: any) {
      toast.error(e.reason || e.message);
      return null;
    }
  };

  const mintERC1155Asset = async (to: string, amount: number, name: string, description: string, ipfsHash: string, maxSupply: number) => {
    if (!erc1155Contract) return null;
    try {
      const tx = await erc1155Contract.mintAsset(to, amount, name, description, ipfsHash, maxSupply);
      toast.success("Minting ERC-1155...");
      return tx;
    } catch (e: any) {
      toast.error(e.reason || e.message);
      return null;
    }
  };

  // --- MARKETPLACE ACTIONS ---

  const listERC721ForSale = async (tokenId: number, priceEth: string) => {
    if (!marketplaceContract || !erc721Contract || !contractAddresses?.Marketplace) throw new Error("Not ready");
    
    // 1. Approve
    const isApproved = await erc721Contract.isApprovedForAll(await signer?.getAddress(), contractAddresses.Marketplace);
    if (!isApproved) {
        const approvedAddr = await erc721Contract.getApproved(tokenId);
        if (approvedAddr.toLowerCase() !== contractAddresses.Marketplace.toLowerCase()) {
            const txApp = await erc721Contract.approve(contractAddresses.Marketplace, tokenId);
            toast.loading("Approving Marketplace...");
            await txApp.wait();
        }
    }

    // 2. List
    const priceWei = ethers.parseEther(priceEth);
    const tx = await marketplaceContract.listERC721(tokenId, priceWei);
    toast.loading("Listing asset...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success("Listed successfully!");
    return receipt;
  };

  const listERC1155ForSale = async (tokenId: number, quantity: number, priceEth: string) => {
    if (!marketplaceContract || !erc1155Contract || !contractAddresses?.Marketplace) throw new Error("Not ready");

    // 1. Approve
    const isApproved = await erc1155Contract.isApprovedForAll(await signer?.getAddress(), contractAddresses.Marketplace);
    if (!isApproved) {
        const txApp = await erc1155Contract.setApprovalForAll(contractAddresses.Marketplace, true);
        toast.loading("Approving Marketplace (One-time)...");
        await txApp.wait();
    }

    // 2. List
    const priceWei = ethers.parseEther(priceEth);
    const tx = await marketplaceContract.listERC1155(tokenId, quantity, priceWei);
    toast.loading("Listing batch...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success("Batch listed!");
    return receipt;
  };

  const buyAsset = async (listingId: number, quantity: number, totalPriceEth: string) => {
    if (!marketplaceContract) throw new Error("No Marketplace");
    
    const value = ethers.parseEther(totalPriceEth);
    const tx = await marketplaceContract.buyItem(listingId, quantity, { value });
    
    toast.loading("Purchasing...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success("Purchase confirmed!");
    return receipt;
  };

  const cancelListing = async (listingId: number) => {
      if (!marketplaceContract) throw new Error("No Marketplace");
      const tx = await marketplaceContract.cancelListing(listingId);
      toast.loading("Cancelling...");
      const receipt = await tx.wait();
      toast.dismiss();
      toast.success("Listing cancelled");
      return receipt;
  };

  const getMarketplaceListings = async (): Promise<MarketplaceListing[]> => {
    if (!marketplaceContract) return [];
    try {
        const rawListings = await marketplaceContract.getAllActiveListings();
        return rawListings.map((l: any) => ({
            listingId: Number(l.listingId),
            seller: l.seller,
            tokenAddress: l.tokenAddress,
            tokenId: Number(l.tokenId),
            quantity: Number(l.quantity),
            pricePerUnit: l.pricePerUnit.toString(),
            priceEth: ethers.formatEther(l.pricePerUnit),
            isERC1155: l.isERC1155,
            active: l.active
        }));
    } catch (e) {
        console.error("Fetch listings error", e);
        return [];
    }
  };

  // --- HELPERS ---

  const transferERC721 = async (from: string, to: string, tokenId: number, feeAmountWei?: string) => {
      if (!erc721Contract) return null;
      const fee = feeAmountWei ? BigInt(feeAmountWei) : await erc721Contract.transferFee();
      const tx = await erc721Contract.transferAsset(from, to, tokenId, { value: fee });
      return tx;
  };

  const getTransferFee = async () => {
      if(!erc721Contract) return null;
      const fee = await erc721Contract.transferFee();
      return fee.toString();
  }

  const getUserAssets = async (address: string) => {
      return { erc721Tokens: [], erc1155Tokens: [] }; 
  }

  const getAssetMetadata = async (tokenId: number, type: 'ERC721'|'ERC1155') => {
      const contract = type === 'ERC721' ? erc721Contract : erc1155Contract;
      if (!contract) return null;
      const m = await contract.getAssetMetadata(tokenId);
      return { name: m.name, description: m.description, ipfsHash: m.ipfsHash, timestamp: Number(m.timestamp), creator: m.creator, maxSupply: Number(m.maxSupply || 0) };
  }

  return (
    <ContractContext.Provider
      value={{
        erc721Contract, erc1155Contract, marketplaceContract, contractAddresses,
        mintERC721Asset, mintERC1155Asset, transferERC721,
        getTransferFee, getUserAssets, getAssetMetadata,
        listERC721ForSale, listERC1155ForSale, buyAsset, cancelListing, getMarketplaceListings
      }}
    >
      {children}
    </ContractContext.Provider>
  );
}

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (context === undefined) throw new Error('useContracts must be used within a ContractProvider');
  return context;
};