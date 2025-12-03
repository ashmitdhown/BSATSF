import React, { useState, useEffect } from 'react';
import { useContracts, MarketplaceListing } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import { Search, Grid, List, ExternalLink, ShoppingCart, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Combined interface for UI
interface DisplayListing extends MarketplaceListing {
  name: string;
  description: string;
  image: string;
  ipfsHash: string;
  timestamp: number;
}

const Marketplace: React.FC = () => {
  const { getMarketplaceListings, getAssetMetadata, buyAsset, cancelListing, contractAddresses } = useContracts();
  const { account } = useWeb3();

  const [listings, setListings] = useState<DisplayListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'ERC721' | 'ERC1155'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load listings on mount. We DO NOT depend on 'account' here.
  // The marketplace should be visible even if disconnected.
  useEffect(() => {
    loadListings();
  }, [getMarketplaceListings]);

  const loadListings = async () => {
    setLoading(true);
    try {
      console.log("Fetching marketplace listings...");
      // 1. Get Core Listing Data from Smart Contract
      const rawListings = await getMarketplaceListings();
      console.log(`Found ${rawListings.length} raw listings.`);

      // 2. Hydrate with Metadata (Name, Image, etc.)
      const hydrated = await Promise.all(rawListings.map(async (l) => {
        // Skip inactive ones immediately
        if (!l.active) return null;

        try {
          // Fetch metadata based on type
          const type = l.isERC1155 ? 'ERC1155' : 'ERC721';
          const meta = await getAssetMetadata(l.tokenId, type);

          return {
            ...l,
            name: meta?.name || `Asset #${l.tokenId}`,
            description: meta?.description || 'No description available',
            image: meta?.ipfsHash ? `https://gateway.pinata.cloud/ipfs/${meta.ipfsHash}` : '',
            ipfsHash: meta?.ipfsHash || '',
            timestamp: meta?.timestamp || Date.now(),
          } as DisplayListing;
        } catch (err) {
          console.warn(`Failed to load metadata for token ${l.tokenId}`, err);
          // Return a fallback object instead of failing completely
          return {
            ...l,
            name: `Unknown Asset #${l.tokenId}`,
            description: 'Metadata unavailable',
            image: '',
            ipfsHash: '',
            timestamp: Date.now(),
          } as DisplayListing;
        }
      }));

      // Filter out nulls and set state
      const validListings = hydrated.filter((l): l is DisplayListing => l !== null);
      console.log(`Displaying ${validListings.length} valid listings.`);
      setListings(validListings);

    } catch (error) {
      console.error("Marketplace load error:", error);
      toast.error("Failed to load listings. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing: DisplayListing) => {
    if (!account) {
      toast.error("Please connect your wallet to buy.");
      return;
    }

    try {
      let qtyToBuy = 1;

      // If ERC-1155, ask how many
      if (listing.isERC1155 && listing.quantity > 1) {
        const input = prompt(`How many do you want to buy? (Max: ${listing.quantity})`, "1");
        if (!input) return;
        qtyToBuy = parseInt(input);
        if (isNaN(qtyToBuy) || qtyToBuy <= 0 || qtyToBuy > listing.quantity) {
          toast.error("Invalid quantity");
          return;
        }
      }

      // Calculate total price
      const pricePerUnit = parseFloat(listing.priceEth);
      const totalEth = (pricePerUnit * qtyToBuy).toString();

      await buyAsset(listing.listingId, qtyToBuy, totalEth);

      // Refresh UI
      await loadListings();
    } catch (e: any) {
      console.error(e);
      toast.error("Purchase failed: " + (e.reason || e.message));
    }
  };

  const handleCancel = async (listingId: number) => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    try {
      await cancelListing(listingId);
      await loadListings();
    } catch (e: any) {
      toast.error("Cancel failed");
    }
  };

  const filtered = listings.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All'
      ? true
      : filterType === 'ERC1155' ? l.isERC1155
        : !l.isERC1155; // ERC721
    return matchesSearch && matchesType;
  });

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-10">

          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div>
              <h1 className="text-white text-4xl font-black">Public Marketplace</h1>
              <p className="text-gray-400 text-lg mt-2">Buy and Sell ERC-721 & ERC-1155 Assets</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{filtered.length} active listings</span>
              <button
                onClick={loadListings}
                className="p-2 bg-[#1A1F2E] border border-[#2A3441] rounded-lg text-white hover:text-[#00E0FF] transition-colors"
                title="Refresh Listings"
              >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-12 glass-card">
              <div className="text-[#E1E1E6] flex items-center justify-center pl-4"><Search size={24} /></div>
              <input
                className="flex w-full bg-transparent text-white px-4 border-none focus:ring-0"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-12 px-4 bg-[#1A1F2E] text-white rounded-lg border border-gray-700"
            >
              <option value="All">All Assets</option>
              <option value="ERC721">NFTs (ERC-721)</option>
              <option value="ERC1155">Multi-Token (ERC-1155)</option>
            </select>

            <div className="flex border border-gray-700 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-3 ${viewMode === 'grid' ? 'bg-[#00E0FF] text-black' : 'text-white'}`}><Grid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-3 ${viewMode === 'list' ? 'bg-[#00E0FF] text-black' : 'text-white'}`}><List size={18} /></button>
            </div>
          </div>

          {/* Loading State */}
          {loading && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00E0FF] mb-4"></div>
              <p className="text-gray-400">Loading marketplace listings...</p>
            </div>
          )}

          {/* Grid View */}
          {!loading && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((asset) => (
                <div key={asset.listingId} className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl overflow-hidden hover:border-[#00E0FF] transition-colors">
                  <div className="h-48 bg-black/50 flex items-center justify-center relative">
                    {asset.image ? <img src={asset.image} alt={asset.name} className="h-full object-cover" /> : <span className="text-gray-500">No Image</span>}
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      {asset.isERC1155 ? 'ERC-1155' : 'ERC-721'}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-white font-bold text-lg truncate">{asset.name}</h3>
                      <span className="text-[#00E0FF] font-mono font-bold">{asset.priceEth} ETH</span>
                    </div>

                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{asset.description}</p>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>Seller: {formatAddress(asset.seller)}</span>
                      {asset.isERC1155 && <span>Qty: {asset.quantity}</span>}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {asset.seller.toLowerCase() === account?.toLowerCase() ? (
                        <button
                          onClick={() => handleCancel(asset.listingId)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 py-2 rounded-lg hover:bg-red-500/20 transition-all"
                        >
                          <XCircle size={16} /> Cancel Listing
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy(asset)}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#00E0FF] text-black font-bold py-2 rounded-lg hover:bg-[#00B8D9] transition-all"
                        >
                          <ShoppingCart size={16} /> Buy Now
                        </button>
                      )}

                      <a href={`https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {!loading && viewMode === 'list' && (
            <div className="space-y-4">
              {filtered.map(asset => (
                <div key={asset.listingId} className="bg-[#1A1F2E] border border-[#2A3441] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-black/50 rounded-lg overflow-hidden">
                      {asset.image && <img src={asset.image} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{asset.name}</h3>
                      <p className="text-sm text-gray-400">Seller: {formatAddress(asset.seller)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00E0FF] font-bold text-xl">{asset.priceEth} ETH</div>
                    {asset.isERC1155 && <div className="text-sm text-gray-500">Available: {asset.quantity}</div>}

                    {asset.seller.toLowerCase() !== account?.toLowerCase() && (
                      <button
                        onClick={() => handleBuy(asset)}
                        className="mt-2 text-sm bg-white/10 px-4 py-1 rounded hover:bg-white/20 text-white"
                      >
                        Buy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No active listings found.</p>
              <p className="text-sm text-gray-600 mt-2">Be the first to list an asset!</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Marketplace;