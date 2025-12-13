import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../contexts/ContractContext';
import { ArrowRightLeft, Wallet, CheckCircle, AlertCircle, Copy, ExternalLink, DollarSign, Clock } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

type TransferStatus = 'idle' | 'selecting' | 'confirming' | 'awaiting' | 'success' | 'failed';

interface Asset {
  id: string;
  tokenId: number;
  name: string;
  description: string;
  type: 'ERC-721' | 'ERC-1155';
  image: string;
  balance?: number;
}

interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  fee: string;
  timestamp: number;
}

const TransferOwnership: React.FC = () => {
  const { account, refreshBalance, loadAssets } = useWeb3();
  const { erc721Contract, erc1155Contract, transferERC721, getTransferFee } = useContracts();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(1); // For ERC-1155 quantity
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('idle');
  const [transferFee, setTransferFee] = useState<string>('0');
  const [transactionReceipt, setTransactionReceipt] = useState<TransactionReceipt | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load assets on mount or account change
  useEffect(() => {
    loadUserAssets();
    loadTransferFee();
  }, [account, erc721Contract, erc1155Contract]);

  useEffect(() => {
    validateAddress();
  }, [recipientAddress]);

  const loadUserAssets = async () => {
    if (!account || !erc721Contract || !erc1155Contract) return;

    setLoading(true);
    try {
      const allAssets: Asset[] = [];

      // 1. Fetch ERC-721s
      try {
        const my721s = await (erc721Contract as any).getMyAssets();
        my721s.forEach((token: any) => {
          allAssets.push({
            id: `erc721-${token.tokenId}`,
            tokenId: Number(token.tokenId),
            name: token.metadata.name,
            description: token.metadata.description,
            type: 'ERC-721',
            image: `https://gateway.pinata.cloud/ipfs/${token.metadata.ipfsHash}`,
          });
        });
      } catch (e) { console.warn("Failed to load 721s", e); }

      // 2. Fetch ERC-1155s
      try {
        const my1155s = await (erc1155Contract as any).getMyAssets();
        my1155s.forEach((token: any) => {
          allAssets.push({
            id: `erc1155-${token.id}`,
            tokenId: Number(token.id),
            name: token.metadata.name,
            description: token.metadata.description,
            type: 'ERC-1155',
            image: `https://gateway.pinata.cloud/ipfs/${token.metadata.ipfsHash}`,
            balance: Number(token.balance),
          });
        });
      } catch (e) { console.warn("Failed to load 1155s", e); }

      setAssets(allAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load your assets');
    } finally {
      setLoading(false);
    }
  };

  const loadTransferFee = async () => {
    try {
      const fee = await getTransferFee();
      if (fee) {
        setTransferFee(fee);
      }
    } catch (error) {
      console.error('Error loading transfer fee:', error);
    }
  };

  const validateAddress = () => {
    try {
      if (recipientAddress && ethers.isAddress(recipientAddress)) {
        setIsValidAddress(true);
      } else {
        setIsValidAddress(false);
      }
    } catch {
      setIsValidAddress(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAsset || !recipientAddress || !account) {
      toast.error('Please select an asset and enter a valid recipient address');
      return;
    }

    if (!isValidAddress) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (recipientAddress.toLowerCase() === account.toLowerCase()) {
      toast.error('Cannot transfer to yourself');
      return;
    }

    // Validate ERC-1155 Quantity
    if (selectedAsset.type === 'ERC-1155') {
      if (transferAmount <= 0) return toast.error("Quantity must be > 0");
      if (transferAmount > (selectedAsset.balance || 0)) return toast.error("Insufficient balance");
    }

    setTransferStatus('confirming');

    try {
      let tx;

      if (selectedAsset.type === 'ERC-721') {
        setTransferStatus('awaiting');
        // Use existing transfer helper
        tx = await transferERC721(account, recipientAddress, selectedAsset.tokenId);
      } else {
        // ERC-1155 Transfer Logic
        if (!erc1155Contract) throw new Error("ERC-1155 contract not loaded");
        setTransferStatus('awaiting');

        // ERC-1155 safeTransferFrom: from, to, id, amount, data
        // Correcting data parameter to empty bytes
        const data = new Uint8Array(0); 
        
        tx = await erc1155Contract.safeTransferFrom(
          account,
          recipientAddress,
          selectedAsset.tokenId,
          transferAmount,
          data 
        );
      }

      if (tx) {
        toast.success('Transaction submitted! Waiting for confirmation...');
        const receipt = await tx.wait(1);

        if (receipt) {
          const txReceipt: TransactionReceipt = {
            hash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: '0', // Ethers v6 receipt might differ slightly, using fallback
            fee: ethers.formatEther(transferFee),
            timestamp: Date.now(),
          };

          setTransactionReceipt(txReceipt);
          setTransferStatus('success');
          toast.success('Asset transferred successfully!');

          // Refresh global state
          await loadUserAssets();
          if (refreshBalance) await refreshBalance();
          if (loadAssets) await loadAssets();
        } else {
          setTransferStatus('failed');
          toast.error('Transaction receipt not received');
        }
      } else {
        setTransferStatus('failed');
      }
    } catch (error: any) {
      console.error('Transfer failed:', error);
      setTransferStatus('failed');

      if (error.code === 4001 || error.message?.includes("rejected")) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for gas + transfer fee');
      } else {
        toast.error(`Transfer failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const resetTransfer = () => {
    setTransferStatus('idle');
    setSelectedAsset(null);
    setRecipientAddress('');
    setTransferAmount(1);
    setTransactionReceipt(null);
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">
          <div className="mb-8">
            <h1 className="text-white text-4xl font-bold mb-2">Transfer Asset Ownership</h1>
            <p className="text-gray-400">Securely transfer your blockchain asset to a new owner.</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="text-white text-xl">Loading your assets...</div>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 text-xl mb-4">No assets found</div>
              <p className="text-gray-500">You need to own assets to transfer them</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Asset Selection */}
              {!selectedAsset ? (
                <div className="lg:col-span-3">
                  <h3 className="text-white text-xl font-bold mb-6">Select Asset to Transfer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="group cursor-pointer glass-card rounded-xl p-4 hover:border-[rgba(0,224,255,0.4)] transition-all"
                      >
                        <div className="relative w-full aspect-square mb-4">
                          <img
                            className="w-full h-full object-cover rounded-lg"
                            src={asset.image}
                            alt={asset.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Asset';
                            }}
                          />
                        </div>
                        <h4 className="text-white font-bold mb-2">{asset.name}</h4>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono bg-[rgba(0,224,255,0.1)] text-[#00E0FF] rounded px-2 py-1">
                            {asset.type}
                          </span>
                          <span className="text-xs text-gray-400">#{asset.tokenId}</span>
                        </div>
                        {asset.balance && (
                          <div className="text-xs text-gray-400 mt-1">Balance: {asset.balance}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Main Transfer Section */}
                  <div className="lg:col-span-2">
                    <div className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl p-6">
                      {/* Selected Asset */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-gray-400 text-sm">Asset to Transfer</h3>
                          <button
                            onClick={() => setSelectedAsset(null)}
                            className="text-[#00E0FF] hover:text-[#00B8D9] text-sm transition-colors"
                          >
                            Change Asset
                          </button>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-32 rounded-lg overflow-hidden">
                            <img
                              className="w-full h-full object-cover"
                              src={selectedAsset.image}
                              alt={selectedAsset.name}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white text-xl font-bold mb-2">{selectedAsset.name}</h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-400">Token ID: <span className="text-white font-mono">#{selectedAsset.tokenId}</span></p>
                              <p className="text-gray-400">Type: <span className="text-white">{selectedAsset.type}</span></p>
                              <p className="text-gray-400">Current Owner: <span className="text-white font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</span></p>
                              {selectedAsset.balance && (
                                <p className="text-gray-400">Available Balance: <span className="text-white">{selectedAsset.balance}</span></p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ERC-1155 Quantity Input */}
                      {selectedAsset.type === 'ERC-1155' && (
                        <div className="mb-6">
                          <label className="block text-white text-sm font-medium mb-2">Quantity to Transfer</label>
                          <input
                            type="number"
                            min={1}
                            max={selectedAsset.balance}
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(Number(e.target.value))}
                            className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#00E0FF] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Transfer Fee */}
                      <div className="mb-6 p-4 bg-[rgba(0,224,255,0.1)] border border-[rgba(0,224,255,0.2)] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-[#00E0FF]" />
                          <span className="text-[#00E0FF] font-medium">Transfer Fee</span>
                        </div>
                        <p className="text-white font-mono text-lg">{ethers.formatEther(transferFee)} ETH</p>
                        <p className="text-gray-400 text-sm">This fee is required for processing the transfer on the blockchain</p>
                      </div>

                      {/* Recipient Address */}
                      <div className="mb-8">
                        <label className="block text-white text-sm font-medium mb-2">Recipient Wallet Address</label>
                        <input
                          type="text"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#00E0FF] focus:outline-none"
                          placeholder="0x..."
                        />
                        {recipientAddress && (
                          <div className="flex items-center gap-2 mt-2">
                            {isValidAddress ? (
                              <>
                                <CheckCircle size={16} className="text-green-400" />
                                <span className="text-green-400 text-sm">Valid Ethereum address</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={16} className="text-red-400" />
                                <span className="text-red-400 text-sm">Invalid address format</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Transfer Button */}
                      <button
                        onClick={handleTransfer}
                        disabled={!isValidAddress || !recipientAddress || transferStatus === 'awaiting' || transferStatus === 'confirming'}
                        className="w-full bg-[#00E0FF] text-[#0F1419] font-bold py-3 px-6 rounded-lg hover:bg-[#00B8D9] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>
                          {transferStatus === 'confirming' ? 'Confirm in Wallet...' :
                            transferStatus === 'awaiting' ? 'Processing...' : 'Transfer Asset'}
                        </span>
                        {(transferStatus === 'awaiting' || transferStatus === 'confirming') ? <Clock size={20} /> : <ArrowRightLeft size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Status and Receipt */}
                  <div className="space-y-4">
                    {/* Transfer Status */}
                    {transferStatus === 'confirming' && (
                      <div className="glass-card rounded-xl p-6 border-2 border-[rgba(255,165,0,0.3)]">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Wallet size={20} className="text-orange-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-lg mb-2">Confirm in Wallet</h4>
                            <p className="text-gray-400">Please confirm the transaction in your MetaMask wallet.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {transferStatus === 'awaiting' && (
                      <div className="glass-card rounded-xl p-6 border-2 border-[rgba(59,130,246,0.3)]">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock size={20} className="text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-lg mb-2">Transaction Pending</h4>
                            <p className="text-gray-400">Waiting for blockchain confirmation...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {transferStatus === 'success' && transactionReceipt && (
                      <div className="glass-card rounded-xl p-6 border-2 border-[rgba(34,197,94,0.3)]">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle size={20} className="text-green-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-lg mb-2">Transfer Successful!</h4>
                            <p className="text-gray-400">Asset ownership has been updated on the blockchain.</p>
                          </div>
                        </div>

                        {/* Transaction Receipt */}
                        <div className="border-t border-gray-600 pt-4 space-y-3">
                          <h5 className="text-white font-medium">Transaction Receipt</h5>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Transaction Hash:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-xs">{transactionReceipt.hash.slice(0, 10)}...{transactionReceipt.hash.slice(-8)}</span>
                                <button onClick={() => copyToClipboard(transactionReceipt.hash)} className="text-[#00E0FF] hover:text-[#00B8D9]">
                                  <Copy size={14} />
                                </button>
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${transactionReceipt.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#00E0FF] hover:text-[#00B8D9]"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-400">Block Number:</span>
                              <span className="text-white">{transactionReceipt.blockNumber}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-400">Gas Used:</span>
                              <span className="text-white">{parseInt(transactionReceipt.gasUsed).toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-400">Transfer Fee:</span>
                              <span className="text-white">{transactionReceipt.fee} ETH</span>
                            </div>
                          </div>

                          <button
                            onClick={resetTransfer}
                            className="w-full mt-4 bg-[rgba(0,224,255,0.1)] text-[#00E0FF] py-2 px-4 rounded-lg hover:bg-[rgba(0,224,255,0.2)] transition-colors"
                          >
                            Transfer Another Asset
                          </button>
                        </div>
                      </div>
                    )}

                    {transferStatus === 'failed' && (
                      <div className="glass-card rounded-xl p-6 border-2 border-[rgba(239,68,68,0.3)]">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={20} className="text-red-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-lg mb-2">Transfer Failed</h4>
                            <p className="text-gray-400">The transaction was rejected or encountered an error.</p>
                            <button
                              onClick={() => setTransferStatus('idle')}
                              className="mt-3 text-sm text-[#00E0FF] hover:text-[#00B8D9] transition-colors"
                            >
                              Try Again
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TransferOwnership;