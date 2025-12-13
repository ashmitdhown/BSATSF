import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import { 
    ArrowLeft, 
    ShieldCheck, 
    Hash, 
    FileText, 
    Layers, 
    User, 
    AlertTriangle, 
    Database, 
    Tag, 
    CircleDollarSign,
    ExternalLink,
    Copy,
    Calendar,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssetDetails: React.FC = () => {
    // 1. Get both ID and Standard from URL parameters
    const { standard, id } = useParams<{ standard: string; id: string }>();
    const navigate = useNavigate();

    const { erc721Contract, erc1155Contract, getMarketplaceListings, contractAddresses } = useContracts();
    const { account } = useWeb3();

    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Market State
    const [listingPrice, setListingPrice] = useState<string | null>(null);
    const [isListed, setIsListed] = useState(false);

    // Provenance State
    const [creationHash, setCreationHash] = useState<string | null>(null);
    const [creationDate, setCreationDate] = useState<string | null>(null);

    // 2. ROBUST TYPE CHECKING
    const isERC1155 = standard?.toUpperCase().includes('1155') || false;
    const assetLabel = isERC1155 ? 'ERC-1155' : 'ERC-721';

    // Helper to extract traits (OpenSea Standard)
    const getAttribute = (metadata: any, key: string) => {
        if (!metadata) return null;
        if (metadata[key]) return metadata[key];
        if (metadata.properties && metadata.properties[key]) return metadata.properties[key];
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
            const found = metadata.attributes.find((attr: any) =>
                attr.trait_type === key || attr.trait_type === key.replace(' ', '_')
            );
            if (found) return found.value;
        }
        return null;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    useEffect(() => {
        let isMounted = true;
        
        // Safety Timeout
        const timer = setTimeout(() => {
            if (isMounted && loading && !asset && (!erc721Contract || !erc1155Contract)) {
                setLoading(false);
                setErrorMsg("Contracts not ready. Please ensure your wallet is connected.");
            }
        }, 8000); // Increased timeout for log scanning

        const fetchAssetDetails = async () => {
            if (!id || !erc721Contract || !erc1155Contract) return;

            setLoading(true);
            setErrorMsg('');

            try {
                const tokenId = BigInt(id);
                let fetchedMetadata: any = null;
                let fetchedOwner: string = '';
                let fetchedSupply: string = '';

                // --- 1. FETCH ASSET DATA ---
                if (isERC1155) {
                    try {
                        const supply = await (erc1155Contract as any).totalSupply(tokenId);
                        if (supply <= 0) throw new Error("Supply is zero");
                        
                        fetchedSupply = supply.toString();
                        const uri = await erc1155Contract.uri(tokenId);
                        
                        fetchedMetadata = { name: `Asset #${id}`, description: '', image: '' };
                        try {
                            const idHex = tokenId.toString(16).padStart(64, '0');
                            const cleanUri = uri.replace('{id}', idHex).replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                            const response = await fetch(cleanUri);
                            if (response.ok) fetchedMetadata = await response.json();
                        } catch (err) { console.warn("IPFS Fetch Error", err); }

                    } catch (e: any) {
                        throw new Error(`ERC-1155 Token #${id} not found.`);
                    }
                } else {
                    try {
                        const owner = await erc721Contract.ownerOf(tokenId);
                        fetchedOwner = owner;
                        const uri = await erc721Contract.tokenURI(tokenId);
                        
                        fetchedMetadata = { name: `Asset #${id}`, description: '', image: '' };
                        try {
                            const gatewayUri = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                            const response = await fetch(gatewayUri);
                            if (response.ok) fetchedMetadata = await response.json();
                        } catch (err) { console.warn("IPFS Fetch Error", err); }

                    } catch (e: any) {
                        throw new Error(`ERC-721 Token #${id} not found.`);
                    }
                }

                // --- 2. FETCH CREATION TRANSACTION (LOGS) ---
                if (isMounted) {
                    try {
                        const zeroAddress = '0x0000000000000000000000000000000000000000';
                        const contract = isERC1155 ? erc1155Contract : erc721Contract;
                        let filter;

                        if (isERC1155) {
                            // TransferSingle(operator, from, to, id, value)
                            // We look for transfers FROM zero address TO anyone
                            filter = contract.filters.TransferSingle(null, zeroAddress, null, tokenId);
                        } else {
                            // Transfer(from, to, tokenId)
                            filter = contract.filters.Transfer(zeroAddress, null, tokenId);
                        }

                        // Query logs from earliest block
                        const logs = await contract.queryFilter(filter, 0, 'latest');
                        
                        if (logs.length > 0) {
                            const creationLog = logs[0]; // The first event is the mint
                            setCreationHash(creationLog.transactionHash);
                            
                            // Get Block Time
                            if (creationLog.blockNumber) {
                                const provider = contract.runner?.provider;
                                if (provider) {
                                    const block = await provider.getBlock(creationLog.blockNumber);
                                    if (block) {
                                        const date = new Date(block.timestamp * 1000);
                                        setCreationDate(date.toLocaleString());
                                    }
                                }
                            }
                        }
                    } catch (logErr) {
                        console.warn("Failed to fetch creation logs:", logErr);
                    }
                }

                // --- 3. DATA PREPARATION ---
                const legalIdFound = getAttribute(fetchedMetadata, 'Legal ID');
                const customAssetId = getAttribute(fetchedMetadata, 'Asset ID');

                if (isMounted) {
                    setAsset({
                        id: tokenId.toString(),
                        customId: customAssetId,
                        owner: fetchedOwner,
                        totalSupply: fetchedSupply,
                        name: fetchedMetadata.name || `Asset #${id}`,
                        description: fetchedMetadata.description || "No description",
                        image: fetchedMetadata.image ? fetchedMetadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : '',
                        legalId: legalIdFound || "N/A"
                    });
                }

                // --- 4. MARKETPLACE CHECK ---
                if (contractAddresses) {
                    const listings = await getMarketplaceListings();
                    const targetAddr = isERC1155 ? contractAddresses.ERC1155 : contractAddresses.ERC721;
                    
                    if (targetAddr) {
                        const activeListing = listings.find(l => 
                            l.tokenId === Number(id) && 
                            l.tokenAddress && 
                            l.tokenAddress.toLowerCase() === targetAddr.toLowerCase() &&
                            l.active
                        );

                        if (isMounted) {
                            if (activeListing) {
                                setListingPrice(activeListing.priceEth);
                                setIsListed(true);
                            } else {
                                setIsListed(false);
                            }
                        }
                    }
                }

            } catch (error: any) {
                console.error("Lookup failed:", error);
                if (isMounted) {
                    setErrorMsg(error.message);
                    setAsset(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAssetDetails();
        return () => { isMounted = false; clearTimeout(timer); };
    }, [id, standard, erc721Contract, erc1155Contract, getMarketplaceListings, contractAddresses, isERC1155]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1419] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00E0FF]"></div>
                <p className="text-gray-400 animate-pulse">Loading {assetLabel} Asset...</p>
            </div>
        );
    }

    if (errorMsg || !asset) {
        return (
            <div className="min-h-screen bg-[#0F1419] flex flex-col items-center justify-center text-white px-4">
                <div className="bg-[#1A1F2E] p-8 rounded-2xl border border-red-500/30 max-w-lg w-full text-center">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
                    <p className="text-gray-400 mb-6">{errorMsg}</p>
                    <button onClick={() => navigate(-1)} className="w-full bg-[#2A3441] hover:bg-[#334053] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <ArrowLeft size={20} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const safeOwner = asset.owner ? asset.owner.slice(2, 8).toUpperCase() : 'MULT';
    const legalIdentifier = asset.legalId !== "N/A" 
        ? asset.legalId 
        : `BSAT-${isERC1155 ? '1155' : '721'}-${asset.id}-${safeOwner}`;

    const displayAssetId = asset.customId || `#${asset.id}`;

    return (
        <div className="min-h-screen bg-[#0F1419] text-white py-10 px-6 md:px-12">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={20} /> Back to Assets
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Image */}
                    <div className="space-y-6">
                        <div className="aspect-square bg-[#1A1F2E] rounded-2xl border border-gray-700 overflow-hidden relative shadow-2xl flex items-center justify-center">
                            {asset.image ? (
                                <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-500 flex flex-col items-center"><div className="text-6xl mb-4">🖼️</div><p>No Image Data</p></div>
                            )}
                            
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                                    <Layers size={16} className="text-[#00E0FF]" />
                                    <span className="font-mono text-sm font-bold">{assetLabel}</span>
                                </div>
                                {isListed && (
                                    <div className="bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-green-500/50 flex items-center gap-2 text-green-400">
                                        <Tag size={16} />
                                        <span className="font-mono text-sm font-bold">FOR SALE</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">{asset.name}</h1>
                            <div className="flex flex-wrap gap-3">
                                <div className="inline-flex items-center gap-2 bg-[#00E0FF]/10 border border-[#00E0FF]/20 px-3 py-1.5 rounded text-[#00E0FF] font-mono text-sm">
                                    <ShieldCheck size={14} /><span>Legal ID: {legalIdentifier}</span>
                                </div>
                                {isListed ? (
                                    <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded text-green-400 font-bold font-mono text-sm">
                                        <CircleDollarSign size={14} /><span>Price: {listingPrice} ETH</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 px-3 py-1.5 rounded text-gray-500 font-mono text-sm">
                                        <span>Not Listed</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* INFO GRID */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1A1F2E] p-4 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-2 text-gray-400 mb-1 text-sm"><Hash size={16} /> Asset ID</div>
                                <div className="text-xl font-bold font-mono text-white truncate" title={displayAssetId}>
                                    {displayAssetId}
                                </div>
                            </div>
                            <div className="bg-[#1A1F2E] p-4 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-2 text-gray-400 mb-1 text-sm"><Layers size={16} /> Standard</div>
                                <div className="text-xl font-bold">{assetLabel}</div>
                            </div>
                            <div className="bg-[#1A1F2E] p-4 rounded-xl border border-gray-800 col-span-2">
                                <div className="flex items-center gap-2 text-gray-400 mb-1 text-sm"><User size={16} /> Owner Address</div>
                                <div className="font-mono text-sm md:text-base truncate text-gray-300">{asset.owner || account || "Multi-Owner (ERC-1155)"}</div>
                            </div>
                            
                            {/* ERC-1155 Total Supply */}
                            {isERC1155 && (
                                <div className="bg-[#1A1F2E] p-4 rounded-xl border border-gray-800 col-span-2">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1 text-sm"><Database size={16} /> Total Supply</div>
                                    <div className="font-mono text-xl text-white">{asset.totalSupply} Units</div>
                                </div>
                            )}

                            {/* CREATION PROVENANCE */}
                            {creationHash && (
                                <div className="bg-[#1A1F2E] p-4 rounded-xl border border-gray-800 col-span-2">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2 text-sm">
                                        <Activity size={16} className="text-[#00E0FF]" /> Provenance (Minting Transaction)
                                    </div>
                                    <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs text-gray-500">Tx Hash:</span>
                                            <a 
                                                href={`https://sepolia.etherscan.io/tx/${creationHash}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[#00E0FF] hover:underline font-mono text-sm truncate"
                                            >
                                                {creationHash}
                                            </a>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => copyToClipboard(creationHash)} className="text-gray-400 hover:text-white transition-colors">
                                                <Copy size={14} />
                                            </button>
                                            <a href={`https://sepolia.etherscan.io/tx/${creationHash}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                    {creationDate && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar size={12} /> Minted on: {creationDate}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-[#1A1F2E]/50 p-2 rounded-lg border border-gray-800/50 col-span-2 flex justify-between items-center px-4">
                                <div className="flex items-center gap-2 text-gray-500 text-xs"><Database size={12} /> Blockchain Token Index</div>
                                <div className="font-mono text-xs text-gray-500">#{asset.id}</div>
                            </div>
                        </div>

                        <div className="bg-[#1A1F2E] p-6 rounded-xl border border-gray-800 flex-grow">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4"><FileText size={20} className="text-gray-400" />Description</h3>
                            <p className="text-gray-300 leading-relaxed">{asset.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetails;