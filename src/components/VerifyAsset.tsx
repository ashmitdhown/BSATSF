import React, { useState } from 'react';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Search, FileText, User, Hash, Clock } from 'lucide-react';

const VerifyAsset: React.FC = () => {
  const { erc721Contract, erc1155Contract, getAssetMetadata } = useContracts();
  const { provider } = useWeb3();

  const [activeTab, setActiveTab] = useState<'asset' | 'tx'>('asset');

  // Asset Verification State
  const [tokenId, setTokenId] = useState<string>("");
  const [tokenType, setTokenType] = useState<'ERC721' | 'ERC1155'>('ERC721');
  const [assetResult, setAssetResult] = useState<{
    owner: string;
    metadata: any;
    isValid: boolean;
  } | null>(null);

  // Tx Verification State
  const [txHash, setTxHash] = useState<string>("");
  const [txResult, setTxResult] = useState<{
    status: number | null; // 1 = success, 0 = fail
    blockNumber: number;
    from: string;
    to: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const verifyToken = async () => {
    if (!tokenId) return toast.error("Enter a token ID");

    setLoading(true);
    setAssetResult(null);

    try {
      const idNum = Number(tokenId);
      let ownerAddress = "Multiple Owners (ERC-1155)";
      let isValid = false;

      // 1. Check Ownership / Existence
      if (tokenType === 'ERC721') {
        if (!erc721Contract) throw new Error("ERC-721 Contract not loaded");
        try {
          ownerAddress = await erc721Contract.ownerOf(idNum);
          isValid = true;
        } catch (e) {
          throw new Error("Token does not exist or invalid ID");
        }
      } else {
        if (!erc1155Contract) throw new Error("ERC-1155 Contract not loaded");
        // ERC-1155 doesn't have a single 'ownerOf'. We check if metadata exists.
        // We can check total supply if your contract supports it, or just metadata.
        try {
          // Assuming the helper or contract validates existence
          const exists = await erc1155Contract.uri(idNum);
          if (exists) isValid = true;
        } catch (e) {
          throw new Error("Token does not exist");
        }
      }

      // 2. Get Metadata
      const meta = await getAssetMetadata(idNum, tokenType);

      if (!meta && !isValid) throw new Error("Asset data not found");

      setAssetResult({
        owner: ownerAddress,
        metadata: meta,
        isValid: true
      });
      toast.success("Asset verified successfully");

    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Verification failed");
      setAssetResult(null);
    } finally {
      setLoading(false);
    }
  };

  const verifyTx = async () => {
    if (!txHash) return toast.error("Enter a transaction hash");

    setLoading(true);
    setTxResult(null);

    try {
      const receipt = await provider?.getTransactionReceipt(txHash);
      if (!receipt) {
        toast.error("Transaction not found on Sepolia");
        return;
      }

      setTxResult({
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to || 'Contract Creation'
      });
      toast.success("Transaction found");
    } catch (e: any) {
      toast.error("Failed to check transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10 flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-2xl">

            <div className="text-center mb-10">
              <h1 className="text-white text-4xl font-black mb-4">Blockchain Verification</h1>
              <p className="text-gray-400 text-lg">Immutable proof of ownership and transaction history.</p>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden border border-[#2A3441] shadow-2xl">
              {/* Tabs */}
              <div className="flex border-b border-[#2A3441]">
                <button
                  onClick={() => setActiveTab('asset')}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'asset' ? 'bg-[#00E0FF]/10 text-[#00E0FF] border-b-2 border-[#00E0FF]' : 'text-gray-400 hover:text-white hover:bg-[#2A3441]'}`}
                >
                  Verify Asset
                </button>
                <button
                  onClick={() => setActiveTab('tx')}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'tx' ? 'bg-[#00E0FF]/10 text-[#00E0FF] border-b-2 border-[#00E0FF]' : 'text-gray-400 hover:text-white hover:bg-[#2A3441]'}`}
                >
                  Verify Transaction
                </button>
              </div>

              <div className="p-8">
                {activeTab === 'asset' ? (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <select
                        value={tokenType}
                        onChange={(e) => setTokenType(e.target.value as any)}
                        className="bg-[#1A1F2E] border border-[#2A3441] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#00E0FF]"
                      >
                        <option value="ERC721">ERC-721 (NFT)</option>
                        <option value="ERC1155">ERC-1155 (Multi)</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={tokenId}
                          onChange={(e) => setTokenId(e.target.value)}
                          placeholder="Enter Token ID (e.g. 1)"
                          className="w-full bg-[#1A1F2E] border border-[#2A3441] rounded-lg pl-4 pr-4 py-3 text-white placeholder-gray-500 focus:border-[#00E0FF] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={verifyToken}
                      disabled={loading}
                      className="w-full bg-[#00E0FF] hover:bg-[#00B8D9] text-black font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                    >
                      {loading ? <span className="animate-spin">⌛</span> : <Search size={20} />}
                      Verify Asset On-Chain
                    </button>

                    {/* Asset Results */}
                    {assetResult && (
                      <div className="mt-6 bg-[#1A1F2E]/50 rounded-xl p-6 border border-[#2A3441] animate-fade-in">
                        <div className="flex items-center gap-3 mb-4 text-green-400">
                          <CheckCircle size={24} />
                          <span className="font-bold text-lg">Valid Asset Found</span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <FileText className="text-gray-500 mt-1" size={18} />
                            <div>
                              <span className="text-gray-400 text-sm block">Asset Name</span>
                              <span className="text-white font-medium">{assetResult.metadata?.name}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <User className="text-gray-500 mt-1" size={18} />
                            <div>
                              <span className="text-gray-400 text-sm block">Current Owner</span>
                              <span className="text-[#00E0FF] font-mono text-sm break-all">{assetResult.owner}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <User className="text-gray-500 mt-1" size={18} />
                            <div>
                              <span className="text-gray-400 text-sm block">Creator</span>
                              <span className="text-gray-300 font-mono text-sm break-all">{assetResult.metadata?.creator}</span>
                            </div>
                          </div>
                          {assetResult.metadata?.description && (
                            <div className="pt-2 border-t border-gray-700">
                              <p className="text-gray-400 text-sm italic">"{assetResult.metadata.description}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative">
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Enter Transaction Hash (0x...)"
                        className="w-full bg-[#1A1F2E] border border-[#2A3441] rounded-lg pl-4 pr-4 py-3 text-white placeholder-gray-500 focus:border-[#00E0FF] focus:outline-none font-mono text-sm"
                      />
                    </div>

                    <button
                      onClick={verifyTx}
                      disabled={loading}
                      className="w-full bg-[#00E0FF] hover:bg-[#00B8D9] text-black font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                    >
                      {loading ? <span className="animate-spin">⌛</span> : <Search size={20} />}
                      Verify Transaction
                    </button>

                    {/* Transaction Results */}
                    {txResult && (
                      <div className="mt-6 bg-[#1A1F2E]/50 rounded-xl p-6 border border-[#2A3441] animate-fade-in">
                        <div className={`flex items-center gap-3 mb-4 ${txResult.status === 1 ? 'text-green-400' : 'text-red-400'}`}>
                          {txResult.status === 1 ? <CheckCircle size={24} /> : <XCircle size={24} />}
                          <span className="font-bold text-lg">{txResult.status === 1 ? 'Transaction Confirmed' : 'Transaction Failed'}</span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Hash className="text-gray-500" size={18} />
                            <div>
                              <span className="text-gray-400 text-sm block">Block Number</span>
                              <span className="text-white font-mono">{txResult.blockNumber}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <User className="text-gray-500" size={18} />
                            <div className="w-full overflow-hidden">
                              <span className="text-gray-400 text-sm block">From</span>
                              <span className="text-gray-300 font-mono text-sm truncate block">{txResult.from}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VerifyAsset;