import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../contexts/ContractContext';
import { Search, Grid, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  tokenId: number;
  owner: string;
  creator: string;
  type: 'ERC-721' | 'ERC-1155';
  image: string;
  description: string;
  ipfsHash: string;
  timestamp: number;
  balance?: number; // For ERC-1155
  price?: number; // Price in ETH if listed
  forSale?: boolean; // Whether asset is listed for sale
}

const Dashboard: React.FC = () => {
  const { account, balanceEth, refreshBalance } = useWeb3();
  const { getUserAssets, getMarketplaceListings } = useContracts();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Recently Added');
  const [tokenFilter, setTokenFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUserAssets();
    refreshBalance && refreshBalance();
  }, [account, getUserAssets]);

  const loadUserAssets = async () => {
    if (!account) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userAssets = await getUserAssets(account);
      const listings = await getMarketplaceListings();
      const listingMap = new Map<number, { price: number; priceEth: string; active: boolean }>();
      listings.forEach(l => {
        if (l.active) {
          listingMap.set(l.tokenId, {
            price: Number(l.priceWei),
            priceEth: l.priceEth,
            active: l.active
          });
        }
      });

      const allAssets: Asset[] = [];

      // Process ERC-721 assets
      userAssets.erc721Tokens.forEach((token) => {
        const listing = listingMap.get(token.tokenId);
        allAssets.push({
          id: `erc721-${token.tokenId}`,
          tokenId: token.tokenId,
          name: token.metadata.name,
          description: token.metadata.description,
          owner: account,
          creator: token.metadata.creator,
          type: 'ERC-721',
          image: `https://ipfs.io/ipfs/${token.metadata.ipfsHash}`,
          ipfsHash: token.metadata.ipfsHash,
          timestamp: token.metadata.timestamp,
          price: listing ? Number(listing.priceEth) : undefined,
          forSale: listing?.active || false,
        });
      });

      // Process ERC-1155 assets
      userAssets.erc1155Tokens.forEach((token) => {
        allAssets.push({
          id: `erc1155-${token.tokenId}`,
          tokenId: token.tokenId,
          name: token.metadata.name,
          description: token.metadata.description,
          owner: account,
          creator: token.metadata.creator,
          type: 'ERC-1155',
          image: `https://ipfs.io/ipfs/${token.metadata.ipfsHash}`,
          ipfsHash: token.metadata.ipfsHash,
          timestamp: token.metadata.timestamp,
          balance: token.balance,
        });
      });

      // Sort by timestamp (newest first)
      allAssets.sort((a, b) => b.timestamp - a.timestamp);
      setAssets(allAssets);
    } catch (error) {
      console.error('Error loading user assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.tokenId.toString().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="relative w-full min-h-full overflow-x-hidden bg-[#0F1419]">
        <div className="animate-grid absolute inset-0"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading your assets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="w-full max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">My Assets</h1>
              <p className="text-gray-400 text-lg mt-2">Your personal blockchain asset collection</p>
            </div>
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm">Balance:</span>
              <span className="text-sm font-mono">{balanceEth} ETH</span>
            </div>
            <Link 
              to="/mint"
              className="flex items-center gap-2 px-4 py-2 bg-[#00E0FF] text-black rounded-lg hover:bg-[#00B8D9] transition-colors font-medium"
            >
              <Plus size={20} />
              Mint New Asset
            </Link>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="w-full md:flex-1">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full glass-card">
                  <div className="text-[#E1E1E6] flex items-center justify-center pl-4">
                    <Search size={24} />
                  </div>
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-[#8D8D99] px-4 text-base font-normal leading-normal" 
                    placeholder="Search assets by name or ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="flex gap-3 flex-wrap justify-start md:justify-end w-full md:w-auto">
              <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg glass-card pl-4 pr-3 hover:bg-[rgba(20,30,50,0.8)] transition-colors">
                <p className="text-white text-sm font-medium leading-normal">Sort By: {sortBy}</p>
                <MoreHorizontal size={20} className="text-white" />
              </button>
              <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg glass-card pl-4 pr-3 hover:bg-[rgba(20,30,50,0.8)] transition-colors">
                <p className="text-white text-sm font-medium leading-normal">Token: {tokenFilter}</p>
                <MoreHorizontal size={20} className="text-white" />
              </button>
              <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg glass-card px-3 hover:bg-[rgba(20,30,50,0.8)] transition-colors">
                <Grid size={24} className="text-white" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="group flex flex-col glass-card rounded-xl p-4 overflow-hidden transition-all duration-300 hover:border-[rgba(0,224,255,0.4)] hover:shadow-2xl hover:shadow-[rgba(0,224,255,0.1)]">
                <div className="relative w-full aspect-square mb-4">
                  <div className="token-orbit"></div>
                  <img className="w-full h-full object-cover rounded-lg" src={asset.image} alt={asset.name} />
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white pr-2">{asset.name}</h3>
                  <span className="text-xs font-mono bg-[rgba(0,224,255,0.1)] text-[#00E0FF] rounded px-2 py-1">{asset.type}</span>
                </div>
                <p className="text-sm text-[#8D8D99] mb-1">Token ID: {asset.tokenId}</p>
                {asset.price !== undefined && asset.forSale && (
                  <div className="text-lg font-bold text-[#00E0FF] mb-2">
                    {asset.price} ETH
                  </div>
                )}
                {asset.price === undefined && asset.type === 'ERC-721' && (
                  <div className="text-sm text-[#8D8D99] mb-2">
                    Not listed
                  </div>
                )}
                <p className="text-sm text-[#8D8D99] mb-4">Owner: {asset.owner}</p>
                <Link 
                  to={`/asset/${asset.id}`}
                  className="mt-auto w-full flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#FF00A8] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity"
                >
                  <span className="truncate">View Details</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-12 text-white">
            <button className="p-2 rounded-lg glass-card hover:bg-[rgba(20,30,50,0.8)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft />
            </button>
            <button className="px-4 py-2 text-sm rounded-lg glass-card bg-[rgba(0,224,255,0.1)] border border-[rgba(0,224,255,0.2)]">1</button>
            <button className="px-4 py-2 text-sm rounded-lg glass-card hover:bg-[rgba(20,30,50,0.8)]">2</button>
            <button className="px-4 py-2 text-sm rounded-lg glass-card hover:bg-[rgba(20,30,50,0.8)]">3</button>
            <span className="text-[#8D8D99]">...</span>
            <button className="px-4 py-2 text-sm rounded-lg glass-card hover:bg-[rgba(20,30,50,0.8)]">10</button>
            <button className="p-2 rounded-lg glass-card hover:bg-[rgba(20,30,50,0.8)]">
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
