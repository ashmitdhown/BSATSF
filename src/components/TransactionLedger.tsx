import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Copy, ChevronLeft, ChevronRight, User, Globe, RefreshCw, Clock } from 'lucide-react';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const TransactionLedger: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { contractAddresses } = useContracts();
  const { provider, account } = useWeb3();

  // Updated state interface to include rawTime for sorting
  const [transactions, setTransactions] = useState<Array<{ 
    hash: string; 
    type: string; 
    date: string; 
    rawTime: number; 
    from: string; 
    to: string; 
    amount: string; 
    tokenId?: number; 
    status: string 
  }>>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'public'>('personal');
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const explorerBase = useMemo(() => {
    const net = contractAddresses?.network || 'sepolia';
    return net === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
  }, [contractAddresses]);

  // Define interfaces locally
  const erc721Interface = new ethers.Interface([
    "event AssetMinted(uint256 indexed tokenId, address indexed to, string metadataURI)",
    "event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 fee)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)" 
  ]);

  const erc1155Interface = new ethers.Interface([
    "event AssetMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string metadataURI)",
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"
  ]);

  const marketplaceInterface = new ethers.Interface([
    "event ItemListed(uint256 indexed listingId, address indexed seller, address indexed tokenAddress, uint256 tokenId, uint256 quantity, uint256 pricePerUnit)",
    "event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed tokenAddress, uint256 tokenId, uint256 quantity, uint256 totalPrice)",
    "event ItemCanceled(uint256 indexed listingId)"
  ]);

  const loadLogs = async () => {
    try {
      if (!provider || !contractAddresses) {
        console.warn("Ledger: Provider or Addresses missing", { provider, contractAddresses });
        return;
      }
      setIsLoading(true);
      setDebugInfo("Fetching block number...");

      const current = await provider.getBlockNumber();
      // Scan last 100,000 blocks
      const fromBlock = Math.max(Number(current) - 100000, 0);
      const toBlock = 'latest';

      console.log(`Scanning Ledger from block ${fromBlock} to ${toBlock}`);
      setDebugInfo(`Scanning blocks ${fromBlock} - ${current}...`);

      const allTx: Array<any> = [];
      const blockCache = new Map<number, number>();

      // Helper to get block timestamp with caching
      const getBlockTimestamp = async (blockNum: number) => {
          if (blockCache.has(blockNum)) return blockCache.get(blockNum) || 0;
          try {
              const block = await provider.getBlock(blockNum);
              const ts = block ? block.timestamp : Math.floor(Date.now() / 1000);
              blockCache.set(blockNum, ts);
              return ts;
          } catch {
              return Math.floor(Date.now() / 1000);
          }
      };

      // Helper to format logs
      const processLog = async (log: any, parsed: ethers.LogDescription | null, contractType: string) => {
        if (!parsed) return;

        // 1. Get Timestamp
        const ts = await getBlockTimestamp(log.blockNumber);
        const displayDate = new Date(ts * 1000).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
        });

        let txData: any = {
          hash: log.transactionHash,
          date: displayDate, // Formatted String
          rawTime: ts,       // Number for sorting
          status: 'Confirmed'
        };

        // 2. ERC721 Events
        if (parsed.name === 'AssetMinted') {
          txData.type = 'Mint';
          txData.from = '0x0000000000000000000000000000000000000000';
          txData.to = parsed.args[1];
          txData.tokenId = Number(parsed.args[0]);
          txData.amount = contractType === 'ERC1155' ? `Qty: ${parsed.args[2]}` : '1 NFT';
        }
        else if (parsed.name === 'Transfer') {
          txData.type = 'Transfer';
          txData.from = parsed.args[0];
          txData.to = parsed.args[1];
          txData.tokenId = Number(parsed.args[2]);
          txData.amount = 'Standard Transfer';
        }
        else if (parsed.name === 'AssetTransferred') {
          txData.type = 'Transfer (Fee)';
          txData.from = parsed.args[1];
          txData.to = parsed.args[2];
          txData.tokenId = Number(parsed.args[0]);
          txData.amount = 'Transfer Fee Paid';
        }
        else if (parsed.name === 'TransferSingle') {
          txData.type = 'Transfer (1155)';
          txData.from = parsed.args[1];
          txData.to = parsed.args[2];
          txData.tokenId = Number(parsed.args[3]);
          txData.amount = `Qty: ${parsed.args[4]}`;
        }

        // 3. Marketplace Events
        else if (parsed.name === 'ItemListed') {
          txData.type = 'Listing';
          txData.from = parsed.args[1];
          txData.to = 'Marketplace';
          txData.tokenId = Number(parsed.args[3]);
          const price = ethers.formatEther(parsed.args[5]);
          txData.amount = `${price} ETH`;
        }
        else if (parsed.name === 'ItemSold') {
          txData.type = 'Purchase';
          txData.from = parsed.args[1]; // Buyer
          txData.to = 'Seller';
          txData.tokenId = Number(parsed.args[3]);
          const price = ethers.formatEther(parsed.args[5]);
          txData.amount = `${price} ETH`;
        }
        else if (parsed.name === 'ItemCanceled') {
          txData.type = 'Cancel Listing';
          txData.from = 'Seller';
          txData.to = '-';
          txData.tokenId = Number(parsed.args[0]);
          txData.amount = '-';
        }

        if (txData.type) allTx.push(txData);
      };

      // --- Fetch Logs ---

      // 1. ERC721
      if (contractAddresses.ERC721) {
        const logs = await provider.getLogs({ address: contractAddresses.ERC721, fromBlock, toBlock });
        for (const log of logs) {
          let parsed = erc721Interface.parseLog(log);
          await processLog(log, parsed, 'ERC721');
        }
      }

      // 2. ERC1155
      if (contractAddresses.ERC1155) {
        const logs = await provider.getLogs({ address: contractAddresses.ERC1155, fromBlock, toBlock });
        for (const log of logs) {
          let parsed = erc1155Interface.parseLog(log);
          await processLog(log, parsed, 'ERC1155');
        }
      }

      // 3. Marketplace
      if (contractAddresses.Marketplace) {
        const logs = await provider.getLogs({ address: contractAddresses.Marketplace, fromBlock, toBlock });
        for (const log of logs) {
          let parsed = marketplaceInterface.parseLog(log);
          await processLog(log, parsed, 'Marketplace');
        }
      }

      // Filter duplicates & Sort by Time (Newest First)
      const uniqueTx = allTx.filter((v, i, a) => a.findIndex(t => (t.hash === v.hash && t.type === v.type)) === i);
      uniqueTx.sort((a, b) => b.rawTime - a.rawTime);

      setTransactions(uniqueTx);
      setDebugInfo("");

    } catch (e: any) {
      console.error("Error loading logs", e);
      setDebugInfo(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [provider, contractAddresses]);

  // --- Filtering Logic ---
  const filteredTransactions = transactions.filter(t => {
    const searchMatch = t.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.to.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // Tab Filtering
    if (activeTab === 'personal') {
      if (!account) return false;
      const myAccount = account.toLowerCase();
      return t.from.toLowerCase() === myAccount || t.to.toLowerCase() === myAccount;
    }

    return true; // 'public' tab shows everything
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const displayedTx = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // export csv function
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = ["Tx Hash", "Date", "Type", "From", "To", "Amount", "Token ID", "Status"];
    const csvRows = [headers.join(",")];

    filteredTransactions.forEach(tx => {
      const row = [
        tx.hash,
        `"${tx.date}"`, 
        tx.type,
        tx.from,
        tx.to,
        `"${tx.amount}"`,
        tx.tokenId || "",
        tx.status
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bsatsf_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Ledger exported successfully!");
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-white text-3xl font-bold">Transaction History</h1>
            <div className="flex gap-2">
              <button
                onClick={loadLogs}
                className="flex items-center gap-2 bg-[#1A1F2E] border border-[#2A3441] text-white px-4 py-2 rounded-lg hover:text-[#00E0FF] transition-colors"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
              </button>
              
              {/* ✅ UPDATED BUTTON WITH ONCLICK HANDLER */}
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {debugInfo && (
            <div className="mb-4 text-xs font-mono text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
              Debug: {debugInfo}
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl overflow-hidden shadow-xl">

            {/* Tabs Navigation */}
            <div className="flex border-b border-[#2A3441]">
              <button
                onClick={() => { setActiveTab('personal'); setCurrentPage(1); }}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'personal' ? 'bg-[#00E0FF]/10 text-[#00E0FF] border-b-2 border-[#00E0FF]' : 'text-gray-400 hover:text-white hover:bg-[#2A3441]'}`}
              >
                <User size={18} /> My Transactions
              </button>
              <button
                onClick={() => { setActiveTab('public'); setCurrentPage(1); }}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'public' ? 'bg-[#00E0FF]/10 text-[#00E0FF] border-b-2 border-[#00E0FF]' : 'text-gray-400 hover:text-white hover:bg-[#2A3441]'}`}
              >
                <Globe size={18} /> Public Ledger
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-[#2A3441]">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hash, address, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:border-[#00E0FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
              {isLoading && transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00E0FF] mb-4"></div>
                  Scanning blockchain history...
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[#0F1419] border-b border-[#2A3441]">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Tx Hash</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Time</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Type</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">From</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">To</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Value/Info</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Explorer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3441]">
                    {displayedTx.length === 0 && (
                      <tr><td colSpan={7} className="p-10 text-center text-gray-500">
                        {activeTab === 'personal' ? "No personal transactions found." : "No transactions found on ledger."}
                      </td></tr>
                    )}
                    {displayedTx.map((tx, index) => (
                      <tr key={index} className="hover:bg-[#0F1419]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <a href={`${explorerBase}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-sm">
                              {tx.hash.slice(0, 8)}...
                            </a>
                            <button className="text-gray-400 hover:text-white" onClick={() => navigator.clipboard.writeText(tx.hash)}>
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-gray-500" />
                                {tx.date}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type.includes('Mint') ? 'bg-green-500/20 text-green-400' :
                              tx.type.includes('Purchase') ? 'bg-purple-500/20 text-purple-400' :
                                tx.type.includes('Listing') ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                            }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm font-mono" title={tx.from}>
                          {tx.from.toLowerCase() === account?.toLowerCase() ? <span className="text-[#00E0FF]">Me</span> : `${tx.from.slice(0, 6)}...`}
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm font-mono" title={tx.to}>
                          {tx.to.toLowerCase() === account?.toLowerCase() ? <span className="text-[#00E0FF]">Me</span> : `${tx.to.slice(0, 6)}...`}
                        </td>
                        <td className="px-6 py-4 text-white text-sm">
                          {tx.amount}
                          {tx.tokenId ? <span className="text-gray-500 ml-2 text-xs">(ID: {tx.tokenId})</span> : ''}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400">
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={`${explorerBase}/tx/${tx.hash}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[#00E0FF] hover:underline text-sm"
                          >
                            View on Etherscan
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A3441] bg-[#0F1419]">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded bg-[#1A1F2E] text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded bg-[#1A1F2E] text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TransactionLedger;
