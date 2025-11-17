// Top-of-file imports (ensure these exist)
import React, { useState } from 'react';
import { useContracts } from '../contexts/ContractContext';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';

const VerifyAsset: React.FC = () => {
  // FIX: add missing imports and handlers, correct getAssetMetadata usage, add Tx Hash input
  // Imports at top of file should include:
  // import { useContracts } from '../contexts/ContractContext';
  // import { useWeb3 } from '../contexts/Web3Context';
  // import toast from 'react-hot-toast';

  const { erc721Contract, getAssetMetadata } = useContracts();
  const { provider } = useWeb3();
  const [tokenId, setTokenId] = React.useState<string>("");
  const [txHash, setTxHash] = React.useState<string>("");
  const [owner, setOwner] = React.useState<string | null>(null);
  const [metadata, setMetadata] = React.useState<any | null>(null);
  const [txStatus, setTxStatus] = React.useState<string | null>(null);

  const verifyToken = async () => {
    try {
      if (!tokenId) return toast.error("Enter a token ID");
      const idNum = Number(tokenId);
      if (!erc721Contract) throw new Error("ERC-721 contract not ready");
      const c = erc721Contract!;
      const o = await c.ownerOf(idNum);
      setOwner(o);
      const md = await getAssetMetadata(idNum, "ERC721"); // FIX: correct parameter order
      setMetadata(md);
      toast.success("Token verified");
    } catch (e: any) {
      setOwner(null);
      setMetadata(null);
      toast.error(e.message || "Token verification failed");
    }
  };

  const verifyTx = async () => {
    try {
      if (!txHash) return toast.error("Enter a transaction hash");
      const receipt = await provider?.getTransactionReceipt(txHash);
      if (!receipt) {
        setTxStatus("Not found");
      } else {
        setTxStatus(receipt.status === 1 ? "Confirmed" : "Failed");
      }
      toast.success("Transaction checked");
    } catch (e: any) {
      setTxStatus(null);
      toast.error(e.message || "Transaction verification failed");
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10 flex items-center justify-center min-height-screen">
          <div className="w-full max-w-lg">
            <div className="glass-card rounded-xl p-8 border-2 border-[rgba(0,224,255,0.2)]">
              <div className="text-center mb-8">
                <h1 className="text-white text-4xl font-bold mb-4">Asset Verification</h1>
                <p className="text-gray-400 text-lg">
                  Enter the asset's Token ID or Transaction Hash to view its ownership and proof on the ledger.
                </p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-3">
                    Token ID
                  </label>
                  <input
                    type="text"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    placeholder="Enter Token ID"
                    className="w-full bg-[#1A1F2E] border border-[#2A3441] rounded-lg px-4 py-4 text-white placeholder-gray-500 focus:border-[#00E0FF] focus:outline-none text-lg"
                  />
                </div>
                
                <button
                  onClick={verifyToken}
                  className="w-full bg-[#00E0FF] hover:bg-[#00B8D9] text-[#0F1419] font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  Verify Asset
                </button>
                
                <div className="pt-4">
                  <label className="block text-white text-sm font-medium mb-3">
                    Transaction Hash
                  </label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Enter Transaction Hash"
                    className="w-full bg-[#1A1F2E] border border-[#2A3441] rounded-lg px-4 py-4 text-white placeholder-gray-500 focus:border-[#00E0FF] focus:outline-none text-lg"
                  />
                </div>
                
                <button
                  onClick={verifyTx}
                  className="w-full bg-[#00E0FF] hover:bg-[#00B8D9] text-[#0F1419] font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  Verify Transaction
                </button>
                
                {/* Optional: display results */}
                {owner && (
                  <div className="text-gray-300 text-sm mt-4">
                    Owner: <span className="font-mono">{owner}</span>
                  </div>
                )}
                {metadata && (
                  <div className="text-gray-300 text-sm">
                    Name: {metadata.name} • Description: {metadata.description}
                  </div>
                )}
                {txStatus && (
                  <div className="text-gray-300 text-sm">
                    Transaction Status: {txStatus}
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
