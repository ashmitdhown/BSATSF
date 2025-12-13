import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../contexts/ContractContext';
import { Search, ChevronLeft, ChevronRight, Plus, Tag, XCircle, RefreshCw, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

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
  balance?: number; 
  priceEth?: string; 
  forSale?: boolean; 
  listingId?: number;
}

// 🔥 MODULE-LEVEL VARIABLE for Session Greeting
let hasGreetedSession = false;

const Dashboard: React.FC = () => {
  const { account, balanceEth, refreshBalance, hideBalance } = useWeb3();
  const navigate = useNavigate();
  
  const { 
    erc721Contract, 
    erc1155Contract, 
    getMarketplaceListings, 
    listERC721ForSale, 
    listERC1155ForSale,
    cancelListing 
  } = useContracts();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenFilter, setTokenFilter] = useState('All');
  
  const [dashboardTitle, setDashboardTitle] = useState("My Assets");
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // --- MODAL STATE ---
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listingAsset, setListingAsset] = useState<Asset | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [listQuantity, setListQuantity] = useState('1');

  // --- Greeting Logic ---
  useEffect(() => {
    const savedName = localStorage.getItem('bsatsf_displayName');
    if (!hasGreetedSession && savedName) {
        const hour = new Date().getHours();
        let timeGreeting = "Good morning";
        if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
        else if (hour >= 17) timeGreeting = "Good evening";

        const useTimeBased = Math.random() > 0.5;
        const greeting = useTimeBased 
            ? `${timeGreeting}, ${savedName}` 
            : `Welcome back, ${savedName}`;
        
        setDashboardTitle(greeting);
        hasGreetedSession = true;
    }
  }, []); 

  useEffect(() => {
    loadUserAssets();
    if (refreshBalance) refreshBalance();
  }, [account, erc721Contract, erc1155Contract]); 

  const handleRefresh = async () => {
      await loadUserAssets();
      if (refreshBalance) await refreshBalance();
      toast.success("Assets refreshed");
  };

  const loadUserAssets = async () => {
    if (!account || !erc721Contract || !erc1155Contract) {
      if(!account) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const listings = await getMarketplaceListings();
      
      const listingMap = new Map<string, { priceEth: string; active: boolean; listingId: number }>();
      listings.forEach(l => {
        if (l.active && l.seller.toLowerCase() === account.toLowerCase()) {
           const key = `${l.isERC1155 ? 'ERC-1155' : 'ERC-721'}-${l.tokenId}`;
           listingMap.set(key, {
             priceEth: l.priceEth,
             active: l.active,
             listingId: l.listingId
           });
        }
      });

      const myAssets: Asset[] = [];

      // Fetch 721s
      try {
        const my721s = await (erc721Contract as any).getMyAssets();
        my721s.forEach((item: any) => {
            const tid = Number(item.tokenId);
            const key = `ERC-721-${tid}`;
            const listInfo = listingMap.get(key);

            myAssets.push({
                id: key,
                tokenId: tid,
                name: item.metadata.name,
                description: item.metadata.description,
                owner: account,
                creator: item.metadata.creator,
                type: 'ERC-721',
                image: `https://gateway.pinata.cloud/ipfs/${item.metadata.ipfsHash}`,
                ipfsHash: item.metadata.ipfsHash,
                timestamp: Number(item.metadata.timestamp),
                priceEth: listInfo?.priceEth,
                forSale: listInfo?.active,
                listingId: listInfo?.listingId 
            });
        });
      } catch (e) { console.warn("Could not fetch 721s", e); }

      // Fetch 1155s
      try {
        const my1155s = await (erc1155Contract as any).getMyAssets();
        my1155s.forEach((item: any) => {
            const tid = Number(item.id); 
            const key = `ERC-1155-${tid}`;
            const listInfo = listingMap.get(key);

            myAssets.push({
                id: key,
                tokenId: tid,
                name: item.metadata.name,
                description: item.metadata.description,
                owner: account,
                creator: item.metadata.creator,
                type: 'ERC-1155',
                image: `https://gateway.pinata.cloud/ipfs/${item.metadata.ipfsHash}`,
                ipfsHash: item.metadata.ipfsHash,
                timestamp: Number(item.metadata.timestamp),
                balance: Number(item.balance),
                priceEth: listInfo?.priceEth,
                forSale: listInfo?.active,
                listingId: listInfo?.listingId 
            });
        });
      } catch (e) { console.warn("Could not fetch 1155s", e); }

      myAssets.sort((a, b) => b.timestamp - a.timestamp);
      setAssets(myAssets);

    } catch (error) {
      console.error('Error loading user assets:', error);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANDLE DELETE (BURN) LOGIC
  const handleBurnAsset = async (asset: Asset) => {
    if (asset.forSale) {
        toast.error("Please cancel the listing before deleting this asset.");
        return;
    }
    
    const confirmMsg = asset.type === 'ERC-1155' 
        ? `Are you sure you want to delete this asset? This will burn all ${asset.balance} copies permanently.`
        : `Are you sure you want to delete ${asset.name}? This action is permanent and cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    const toastId = toast.loading("Burning asset on blockchain...");

    try {
        if (asset.type === 'ERC-1155') {
            const tx = await (erc1155Contract as any).burn(account, asset.tokenId, asset.balance);
            await tx.wait();
        } else {
            const tx = await (erc721Contract as any).burn(asset.tokenId);
            await tx.wait();
        }
        
        toast.success("Asset deleted successfully", { id: toastId });
        await loadUserAssets(); 
        
    } catch (error: any) {
        console.error("Burn failed:", error);
        if (error.message.includes("burn caller is not owner")) {
            toast.error("You do not own this asset", { id: toastId });
        } else if (error.code === 'ACTION_REJECTED') {
            toast.error("Transaction rejected", { id: toastId });
        } else {
            toast.error("Delete failed. Check if contract supports burning.", { id: toastId });
        }
    }
  };

  const handleCancelListing = async (asset: Asset) => {
    if (!asset.listingId) return;
    if(!window.confirm(`Are you sure you want to remove ${asset.name} from the marketplace?`)) return;

    try {
        await cancelListing(asset.listingId);
        await loadUserAssets(); 
    } catch (e: any) {
        toast.error("Failed to cancel listing");
    }
  };

  // ✅ OPEN MODAL
  const handleListForSale = (asset: Asset) => {
      setListingAsset(asset);
      setListPrice('');
      setListQuantity('1'); // Default to 1
      setIsListModalOpen(true);
  };

  // ✅ CONFIRM LISTING WITH BETTER ERROR HANDLING
  const confirmListing = async () => {
      if (!listingAsset || !listPrice) {
          toast.error("Please enter a price");
          return;
      }

      try {
          console.log(`Listing ${listingAsset.type} - Token ID: ${listingAsset.tokenId}`);

          if (listingAsset.type === 'ERC-1155') {
              const qty = parseInt(listQuantity);
              if (isNaN(qty) || qty <= 0) { 
                  toast.error("Invalid quantity"); 
                  return; 
              }
              if (qty > (listingAsset.balance || 0)) { 
                  toast.error(`Insufficient balance (Max: ${listingAsset.balance})`); 
                  return; 
              }
              
              await listERC1155ForSale(listingAsset.tokenId, qty, listPrice);
          } else {
              // ERC-721
              await listERC721ForSale(listingAsset.tokenId, listPrice);
          }
          
          setIsListModalOpen(false);
          setListingAsset(null);
          await loadUserAssets();
          
      } catch (e: any) {
          console.error("Listing Error:", e);
          if (e.code === 'ACTION_REJECTED') {
              toast.error("Transaction rejected");
          } else if (e.message.includes("Marketplace not approved")) {
              toast.error("Approval failed. Please try again.");
          } else {
              toast.error("Listing failed: " + (e.reason || "Unknown error"));
          }
      }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.tokenId.toString().includes(searchTerm);
    const matchesType = tokenFilter === 'All' ? true : asset.type === tokenFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const displayedAssets = filteredAssets.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-10">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-white text-4xl font-black">{dashboardTitle}</h1>
              <p className="text-gray-400 text-lg mt-2">Manage your blockchain collection</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="bg-[#1A1F2E] px-4 py-2 rounded-lg border border-gray-700">
                    <span className="text-gray-400 text-sm">Balance: </span>
                    <span className="text-[#00E0FF] font-mono font-bold">
                        {hideBalance ? "•••• ETH" : `${balanceEth?.slice(0,6)} ETH`}
                    </span>
                </div>

                <button 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-2 bg-[#1A1F2E] border border-gray-700 rounded-lg text-white hover:text-[#00E0FF] hover:border-[#00E0FF] transition-all disabled:opacity-50"
                    title="Refresh Assets"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>

                <Link to="/mint" className="flex items-center gap-2 px-4 py-2 bg-[#00E0FF] text-black rounded-lg hover:bg-[#00B8D9] font-bold transition-colors">
                    <Plus size={20} /> Mint New
                </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
            <div className="flex-1 w-full relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
                <input 
                  className="w-full bg-[#1A1F2E] border border-gray-700 text-white rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#00E0FF] focus:outline-none" 
                  placeholder="Search assets..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2">
                 <select 
                    value={tokenFilter} 
                    onChange={(e) => setTokenFilter(e.target.value)}
                    className="bg-[#1A1F2E] text-white border border-gray-700 rounded-lg px-4 py-3 outline-none"
                 >
                    <option value="All">All Items</option>
                    <option value="ERC-721">NFTs</option>
                    <option value="ERC-1155">Multi-Token</option>
                 </select>
            </div>
          </div>

          {/* Grid */}
          {loading && assets.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00E0FF] mb-4"></div>
                 <p className="text-gray-400">Loading assets...</p>
             </div>
          ) : filteredAssets.length === 0 ? (
             <div className="text-center py-20 bg-[#1A1F2E]/50 rounded-xl border border-dashed border-gray-700">
                 <p className="text-gray-400 text-lg">No assets found.</p>
                 <Link to="/mint" className="text-[#00E0FF] hover:underline mt-2 inline-block">Mint your first asset</Link>
             </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedAssets.map((asset) => (
                <div key={asset.id} className="group flex flex-col glass-card bg-[#1A1F2E] border border-gray-800 rounded-xl overflow-hidden hover:border-[#00E0FF] transition-all duration-300 relative">
                    
                    {/* Delete Button */}
                    <button 
                        onClick={(e) => {
                            e.preventDefault(); 
                            e.stopPropagation();
                            handleBurnAsset(asset);
                        }}
                        className="absolute top-3 right-3 z-10 p-2 bg-red-500/20 backdrop-blur-md rounded-lg text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Asset (Burn)"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div className="relative aspect-square bg-black/40">
                        {asset.image ? (
                            <img className="w-full h-full object-cover" src={asset.image} alt={asset.name} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white font-mono border border-white/10">
                            {asset.type}
                        </div>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-lg font-bold text-white truncate w-full" title={asset.name}>{asset.name}</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{asset.description}</p>
                        
                        <div className="mt-auto space-y-2">
                             <div className="flex justify-between text-xs text-gray-500 font-mono">
                                 <span>ID: #{asset.tokenId}</span>
                                 {asset.type === 'ERC-1155' && <span>Qty: {asset.balance}</span>}
                             </div>

                             {/* Listed vs Not Listed */}
                             {asset.forSale ? (
                                 <div className="flex flex-col gap-2">
                                     <div className="bg-[#00E0FF]/10 text-[#00E0FF] text-center py-1 rounded-lg font-bold border border-[#00E0FF]/20 text-sm">
                                         Listed: {asset.priceEth} ETH
                                     </div>
                                     <button 
                                         onClick={() => handleCancelListing(asset)}
                                         className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1 rounded-lg transition-colors font-medium text-sm border border-red-500/20"
                                     >
                                         <XCircle size={14}/> Cancel Listing
                                     </button>
                                 </div>
                             ) : (
                                 <button 
                                     onClick={() => handleListForSale(asset)}
                                     className="w-full flex items-center justify-center gap-2 bg-[#2A3441] hover:bg-[#334053] text-white py-2 rounded-lg transition-colors font-medium text-sm"
                                 >
                                     <Tag size={16}/> List for Sale
                                 </button>
                             )}

                             {/* ✅ RESTORED LINK: Points to original route to fix 404 */}
                             <Link 
                                to={`/asset/${asset.tokenId}`}
                                className="block text-center w-full py-2 bg-[#00E0FF] text-black font-bold rounded-lg hover:bg-[#00B8D9] transition-colors text-sm"
                             >
                                View Details
                             </Link>
                        </div>
                    </div>
                </div>
                ))}
             </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12 text-white">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[#1A1F2E] hover:bg-gray-700 disabled:opacity-50"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-gray-400">Page {currentPage} of {totalPages}</span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[#1A1F2E] hover:bg-gray-700 disabled:opacity-50"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
          )}

        </div>
      </div>

      {/* LISTING MODAL */}
      {isListModalOpen && listingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1A1F2E] border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                <button 
                    onClick={() => setIsListModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <XCircle size={24} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-2">List Asset for Sale</h3>
                <p className="text-gray-400 text-sm mb-6">Set a fixed price for <span className="text-white font-bold">{listingAsset.name}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Price (ETH)</label>
                        <input 
                            type="number" 
                            value={listPrice}
                            onChange={(e) => setListPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#00E0FF] outline-none"
                        />
                    </div>

                    {listingAsset.type === 'ERC-1155' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Quantity (Max: {listingAsset.balance})
                            </label>
                            <input 
                                type="number" 
                                value={listQuantity}
                                onChange={(e) => setListQuantity(e.target.value)}
                                min="1"
                                max={listingAsset.balance}
                                className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#00E0FF] outline-none"
                            />
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={() => setIsListModalOpen(false)}
                            className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmListing}
                            className="flex-1 px-4 py-3 bg-[#00E0FF] text-black rounded-lg hover:bg-[#00B8D9] font-bold transition-colors"
                        >
                            Confirm Listing
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;