import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const TransactionLedger: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { erc721Contract, erc1155Contract, marketplaceContract, contractAddresses } = useContracts();
  const { provider } = useWeb3();
  const [transactions, setTransactions] = useState<Array<{ hash: string; type: string; date: string; from: string; to: string; amount: string; tokenId?: number; status: string }>>([]);

  const explorerBase = useMemo(() => {
    const net = contractAddresses?.network || 'sepolia';
    return net === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
  }, [contractAddresses]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!provider || !erc721Contract) return;
        const current = await provider.getBlockNumber();
        const fromBlock = Math.max(Number(current) - 20000, 0);
        const toBlock: number | string = 'latest';

        const all: Array<{ hash: string; type: string; date: string; from: string; to: string; amount: string; tokenId?: number; status: string }> = [];

        const pushEvent = async (log: any, parsed: ethers.LogDescription) => {
          const b = await provider.getBlock(log.blockNumber);
          const ts = b && typeof b.timestamp !== 'undefined' ? Number(b.timestamp) : Math.floor(Date.now() / 1000);
          const when = new Date(ts * 1000);
          const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;

          if (parsed.name === 'AssetMinted') {
            const tokenId = Number(parsed.args[0]);
            const to = String(parsed.args[1]);
            all.push({ hash: log.transactionHash, type: 'Mint', date, from: '0x0000000000000000000000000000000000000000', to, amount: '0', tokenId, status: 'Confirmed' });
          } else if (parsed.name === 'AssetTransferred') {
            const tokenId = Number(parsed.args[0]);
            const from = String(parsed.args[1]);
            const to = String(parsed.args[2]);
            const fee = ethers.formatEther(parsed.args[3] as bigint);
            all.push({ hash: log.transactionHash, type: 'Transfer', date, from, to, amount: `${fee} ETH fee`, tokenId, status: 'Confirmed' });
          } else if (parsed.name === 'Listed') {
            const seller = String(parsed.args[0]);
            const tokenId = Number(parsed.args[1]);
            const price = ethers.formatEther(parsed.args[2] as bigint);
            all.push({ hash: log.transactionHash, type: 'Listing', date, from: seller, to: '-', amount: `${price} ETH`, tokenId, status: 'Confirmed' });
          } else if (parsed.name === 'ListingCancelled') {
            const seller = String(parsed.args[0]);
            const tokenId = Number(parsed.args[1]);
            all.push({ hash: log.transactionHash, type: 'Unlisting', date, from: seller, to: '-', amount: '0', tokenId, status: 'Confirmed' });
          } else if (parsed.name === 'Purchased') {
            const buyer = String(parsed.args[0]);
            const seller = String(parsed.args[1]);
            const tokenId = Number(parsed.args[2]);
            const price = ethers.formatEther(parsed.args[3] as bigint);
            const fee = ethers.formatEther(parsed.args[4] as bigint);
            all.push({ hash: log.transactionHash, type: 'Purchase', date, from: buyer, to: seller, amount: `${price} ETH (+${fee} fee)`, tokenId, status: 'Confirmed' });
          }
        };

        const erc721Logs = await provider.getLogs({ address: erc721Contract.target as string, fromBlock, toBlock });
        for (const l of erc721Logs) {
          try {
            const parsed = erc721Contract.interface.parseLog(l);
            await pushEvent(l, parsed as any);
          } catch {}
        }

        if (erc1155Contract) {
          const erc1155Logs = await provider.getLogs({ address: erc1155Contract.target as string, fromBlock, toBlock });
          for (const l of erc1155Logs) {
            try {
              const parsed = erc1155Contract.interface.parseLog(l);
              await pushEvent(l, parsed as any);
            } catch {}
          }
        }

        if (marketplaceContract) {
          const mpLogs = await provider.getLogs({ address: marketplaceContract.target as string, fromBlock, toBlock });
          for (const l of mpLogs) {
            try {
              const parsed = marketplaceContract.interface.parseLog(l);
              await pushEvent(l, parsed as any);
            } catch {}
          }
        }

        all.sort((a, b) => (a.date < b.date ? 1 : -1));
        setTransactions(all);
      } catch {}
    };

    loadLogs();

    const unsubscribers: Array<() => void> = [];
    if (erc721Contract) {
      const fn1 = (tokenId: any, to: any, metadataURI: any, ev: any) => {
        const when = new Date();
        const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        setTransactions((prev) => [{ hash: ev.log.transactionHash, type: 'Mint', date, from: '0x0000000000000000000000000000000000000000', to: String(to), amount: '0', tokenId: Number(tokenId), status: 'Confirmed' }, ...prev]);
      };
      const fn2 = (tokenId: any, from: any, to: any, fee: any, ev: any) => {
        const when = new Date();
        const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        setTransactions((prev) => [{ hash: ev.log.transactionHash, type: 'Transfer', date, from: String(from), to: String(to), amount: `${ethers.formatEther(fee as bigint)} ETH fee`, tokenId: Number(tokenId), status: 'Confirmed' }, ...prev]);
      };
      erc721Contract.on('AssetMinted', fn1);
      erc721Contract.on('AssetTransferred', fn2);
      unsubscribers.push(() => erc721Contract.removeListener('AssetMinted', fn1));
      unsubscribers.push(() => erc721Contract.removeListener('AssetTransferred', fn2));
    }
    if (marketplaceContract) {
      const fn3 = (seller: any, tokenId: any, price: any, ev: any) => {
        const when = new Date();
        const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        setTransactions((prev) => [{ hash: ev.log.transactionHash, type: 'Listing', date, from: String(seller), to: '-', amount: `${ethers.formatEther(price as bigint)} ETH`, tokenId: Number(tokenId), status: 'Confirmed' }, ...prev]);
      };
      const fn4 = (seller: any, tokenId: any, ev: any) => {
        const when = new Date();
        const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        setTransactions((prev) => [{ hash: ev.log.transactionHash, type: 'Unlisting', date, from: String(seller), to: '-', amount: '0', tokenId: Number(tokenId), status: 'Confirmed' }, ...prev]);
      };
      const fn5 = (buyer: any, seller: any, tokenId: any, price: any, fee: any, ev: any) => {
        const when = new Date();
        const date = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        setTransactions((prev) => [{ hash: ev.log.transactionHash, type: 'Purchase', date, from: String(buyer), to: String(seller), amount: `${ethers.formatEther(price as bigint)} ETH (+${ethers.formatEther(fee as bigint)} fee)`, tokenId: Number(tokenId), status: 'Confirmed' }, ...prev]);
      };
      marketplaceContract.on('Listed', fn3);
      marketplaceContract.on('ListingCancelled', fn4);
      marketplaceContract.on('Purchased', fn5);
      unsubscribers.push(() => marketplaceContract.removeListener('Listed', fn3));
      unsubscribers.push(() => marketplaceContract.removeListener('ListingCancelled', fn4));
      unsubscribers.push(() => marketplaceContract.removeListener('Purchased', fn5));
    }
    return () => unsubscribers.forEach((u) => u());
  }, [provider, erc721Contract, erc1155Contract, marketplaceContract, contractAddresses]);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-3xl font-bold">Transaction History</h1>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Download size={16} />
            Export Data
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl overflow-hidden">
          {/* Search and Filters */}
          <div className="p-6 border-b border-[#2A3441]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by hash or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:border-[#00E0FF] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select className="bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-2.5 text-white focus:border-[#00E0FF] focus:outline-none">
                  <option>Type: All</option>
                  <option>Transfer</option>
                  <option>Mint</option>
                </select>
                <select className="bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-2.5 text-white focus:border-[#00E0FF] focus:outline-none">
                  <option>Status: All</option>
                  <option>Confirmed</option>
                  <option>Pending</option>
                  <option>Failed</option>
                </select>
                <button className="text-blue-400 hover:text-blue-300 px-4 py-2.5 text-sm transition-colors">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F1419] border-b border-[#2A3441]">
                <tr>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Transaction Hash</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Type</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Date</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">From</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">To</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Amount</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3441]">
                {transactions.filter((t) =>
                  t.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  t.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  t.to.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((tx, index) => (
                  <tr key={index} className="hover:bg-[#0F1419]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a href={`${explorerBase}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-sm">{tx.hash}</a>
                        <button className="text-gray-400 hover:text-white" onClick={() => navigator.clipboard.writeText(tx.hash)}>
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{tx.type}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{tx.date}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm font-mono">{tx.from}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm font-mono">{tx.to}</td>
                    <td className="px-6 py-4 text-white text-sm">{tx.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'Confirmed' ? 'bg-green-900/50 text-green-400' :
                        tx.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A3441]">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Rows per page:</span>
              <select className="bg-[#0F1419] border border-[#2A3441] rounded px-2 py-1 text-white text-sm">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <div className="text-sm text-gray-400">
              Page 1 of 25
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-[#2A3441] rounded transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
              <button className="px-3 py-1 text-gray-400 hover:text-white hover:bg-[#2A3441] rounded text-sm transition-colors">2</button>
              <button className="px-3 py-1 text-gray-400 hover:text-white hover:bg-[#2A3441] rounded text-sm transition-colors">3</button>
              <span className="px-2 text-gray-400">...</span>
              <button className="px-3 py-1 text-gray-400 hover:text-white hover:bg-[#2A3441] rounded text-sm transition-colors">25</button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-[#2A3441] rounded transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default TransactionLedger;
