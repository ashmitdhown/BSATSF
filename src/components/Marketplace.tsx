// Marketplace component (fix duplicate nested definition and render UI from the top-level component)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import { Search, Grid, List, Eye, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface MarketplaceAsset {
  id: string;
  tokenId: number;
  name: string;
  description: string;
  owner: string;
  creator: string;
  type: 'ERC-721' | 'ERC-1155';
  image: string;
  ipfsHash: string;
  timestamp: number;
  price?: number;
  forSale?: boolean;
  balance?: number; // For ERC-1155
}

const Marketplace: React.FC = () => {
  const { erc721Contract, erc1155Contract, getUserAssets, getMarketplaceListings, listERC721ForSale, buyERC721 } = useContracts();
  const { account, accounts, refreshBalance } = useWeb3();
  const [assets, setAssets] = useState<MarketplaceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'ERC-721' | 'ERC-1155'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => {
    loadAllAssets();
  }, [erc721Contract, erc1155Contract, accounts]);

  const loadAllAssets = async () => {
    if (!erc721Contract || !erc1155Contract || accounts.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const allAssets: MarketplaceAsset[] = [];

    try {
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

      for (const accountAddress of accounts) {
        const userAssets = await getUserAssets(accountAddress);
        
        // ERC-721
        userAssets.erc721Tokens.forEach((token) => {
          const listing = listingMap.get(token.tokenId);
          allAssets.push({
            id: `erc721-${token.tokenId}-${accountAddress}`,
            tokenId: token.tokenId,
            name: token.metadata.name,
            description: token.metadata.description,
            owner: accountAddress,
            creator: token.metadata.creator,
            type: 'ERC-721',
            image: `https://ipfs.io/ipfs/${token.metadata.ipfsHash}`,
            ipfsHash: token.metadata.ipfsHash,
            timestamp: token.metadata.timestamp,
            forSale: listing?.active || false,
            price: listing ? Number(listing.priceEth) : undefined,
          });
        });

        // ERC-1155
        userAssets.erc1155Tokens.forEach((token) => {
          allAssets.push({
            id: `erc1155-${token.tokenId}-${accountAddress}`,
            tokenId: token.tokenId,
            name: token.metadata.name,
            description: token.metadata.description,
            owner: accountAddress,
            creator: token.metadata.creator,
            type: 'ERC-1155',
            image: `https://ipfs.io/ipfs/${token.metadata.ipfsHash}`,
            ipfsHash: token.metadata.ipfsHash,
            timestamp: token.metadata.timestamp,
            balance: token.balance,
            forSale: false,
          });
        });
      }

      // Sort
      allAssets.sort((a, b) => {
        switch (sortBy) {
          case 'newest': return b.timestamp - a.timestamp;
          case 'oldest': return a.timestamp - b.timestamp;
          case 'name':   return a.name.localeCompare(b.name);
          default:       return b.timestamp - a.timestamp;
        }
      });

      setAssets(allAssets);
    } catch (error) {
      console.error('Error loading marketplace assets:', error);
      toast.error('Failed to load marketplace assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || asset.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString();
  const isOwnAsset = (owner: string) => owner.toLowerCase() === account?.toLowerCase();

  const [listPrice, setListPrice] = useState<Record<number, string>>({});
  const handleList = async (tokenId: number) => {
    try {
      const priceEth = listPrice[tokenId] || '0';
      if (!priceEth || Number(priceEth) <= 0) return toast.error('Enter a valid price');
      const receipt = await listERC721ForSale(tokenId, priceEth);
      toast.success('Listed');
      if (refreshBalance) await refreshBalance();
      await loadAllAssets();
    } catch (e: any) {
      toast.error(e.message || 'Listing failed');
    }
  };
  const handleBuy = async (tokenId: number) => {
    try {
      const receipt = await buyERC721(tokenId);
      toast.success('Purchased');
      if (refreshBalance) await refreshBalance();
      await loadAllAssets();
    } catch (e: any) {
      toast.error(e.message || 'Purchase failed');
    }
  };

  if (loading) {
    return (
      <div className="relative w-full min-h-full overflow-x-hidden bg-[#0F1419]">
        <div className="animate-grid absolute inset-0"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading marketplace...</div>
        </div>
      </div>
    );
  }

  // Render UI directly from the top-level component (fixed: removed nested function Marketplace)
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div>
              <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                Public Marketplace
              </h1>
              <p className="text-gray-400 text-lg mt-2">
                Discover and explore assets from all users
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {filteredAssets.length} assets found
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
            <div className="w-full lg:flex-1">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-12 glass-card">
                <div className="text-[#E1E1E6] flex items-center justify-center pl-4">
                  <Search size={24} />
                </div>
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-[#8D8D99] px-4 text-base"
                  placeholder="Search by name, description, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-12 px-4 bg-[rgba(20,25,40,0.6)] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00E0FF]"
              >
                <option value="All">All Types</option>
                <option value="ERC-721">ERC-721 (NFTs)</option>
                <option value="ERC-1155">ERC-1155 (Multi-Token)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-12 px-4 bg-[rgba(20,25,40,0.6)] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00E0FF]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>

              <div className="flex border border-white/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-[#00E0FF] text-black' : 'bg-[rgba(20,25,40,0.6)] text-white hover:bg-[rgba(20,25,40,0.8)]'} transition-colors`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ${viewMode === 'list' ? 'bg-[#00E0FF] text-black' : 'bg-[rgba(20,25,40,0.6)] text-white hover:bg-[rgba(20,25,40,0.8)]'} transition-colors`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Assets */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl overflow-hidden">
                  <div className="h-40 bg-[#0F1419] flex items-center justify-center">
                    {asset.image ? (
                      <img src={asset.image} alt={asset.name} className="max-h-full" />
                    ) : (
                      <div className="text-gray-500">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">{asset.name}</h3>
                      <span className="text-xs px-2 py-1 rounded bg-[#2A3441] text-gray-300">{asset.type}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">{asset.description}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      Owner: {formatAddress(asset.owner)} • Minted: {formatDate(asset.timestamp)}
                    </div>
                    {asset.price !== undefined && asset.forSale && (
                      <div className="mt-2 text-lg font-bold text-[#00E0FF]">
                        {asset.price} ETH
                      </div>
                    )}
                    {asset.price === undefined && asset.type === 'ERC-721' && (
                      <div className="mt-2 text-sm text-gray-500">
                        Not listed
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Link
                        to={`/asset/${asset.tokenId}`}
                        className="flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      >
                        <Eye size={16} /> View
                      </Link>
                      {isOwnAsset(asset.owner) && asset.type === 'ERC-721' && (
                        <div className="flex items-center gap-2">
                          <input
                            className="px-2 py-1 rounded bg-[#2A3441] text-white text-sm w-24"
                            placeholder="Price"
                            value={listPrice[asset.tokenId] || ''}
                            onChange={(e) => setListPrice({ ...listPrice, [asset.tokenId]: e.target.value })}
                          />
                          <button
                            onClick={() => handleList(asset.tokenId)}
                            className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                          >
                            List
                          </button>
                        </div>
                      )}
                      {asset.forSale && (
                        <button
                          onClick={() => handleBuy(asset.tokenId)}
                          className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm"
                        >
                          Buy
                        </button>
                      )}
                      <a
                        href={`https://ipfs.io/ipfs/${asset.ipfsHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded bg-[#2A3441] text-gray-200 text-sm hover:bg-[#334053]"
                      >
                        <ExternalLink size={16} /> IPFS
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between bg-[#1A1F2E] border border-[#2A3441] rounded-xl p-4">
                  <div>
                    <div className="text-white font-semibold">
                      [{asset.type}] {asset.name} — #{asset.tokenId}
                    </div>
                    <div className="text-xs text-gray-500">
                      Owner: {formatAddress(asset.owner)} • Minted: {formatDate(asset.timestamp)}
                    </div>
                    {asset.price !== undefined && asset.forSale && (
                      <div className="text-lg font-bold text-[#00E0FF] mt-1">
                        {asset.price} ETH
                      </div>
                    )}
                    {asset.price === undefined && asset.type === 'ERC-721' && (
                      <div className="text-sm text-gray-500 mt-1">
                        Not listed
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/asset/${asset.tokenId}`}
                      className="flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      <Eye size={16} /> View
                    </Link>
                    {isOwnAsset(asset.owner) && asset.type === 'ERC-721' && (
                      <div className="flex items-center gap-2">
                        <input
                          className="px-2 py-1 rounded bg-[#2A3441] text-white text-sm w-24"
                          placeholder="Price"
                          value={listPrice[asset.tokenId] || ''}
                          onChange={(e) => setListPrice({ ...listPrice, [asset.tokenId]: e.target.value })}
                        />
                        <button
                          onClick={() => handleList(asset.tokenId)}
                          className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                        >
                          List
                        </button>
                      </div>
                    )}
                    {asset.forSale && (
                      <button
                        onClick={() => handleBuy(asset.tokenId)}
                        className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm"
                      >
                        Buy
                      </button>
                    )}
                    <a
                      href={`https://ipfs.io/ipfs/${asset.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded bg-[#2A3441] text-gray-200 text-sm hover:bg-[#334053]"
                    >
                      <ExternalLink size={16} /> IPFS
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Marketplace;
