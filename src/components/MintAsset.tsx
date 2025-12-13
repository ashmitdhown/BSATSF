import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../contexts/ContractContext';
import { uploadFileToIPFS, uploadJsonToIPFS, ipfsGatewayUrl, ipfsUri } from '../utils/ipfs';
import toast from 'react-hot-toast';

const MintAsset: React.FC = () => {
  const navigate = useNavigate();
  const { account, refreshBalance } = useWeb3();
  const { mintERC721Asset, mintERC1155Asset } = useContracts();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ipfsHash, setIpfsHash] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetId, setAssetId] = useState('');
  const [legalId, setLegalId] = useState('');
  const [description, setDescription] = useState('');
  const [isTransferable, setIsTransferable] = useState(true);
  const [tokenType, setTokenType] = useState<'ERC721' | 'ERC1155'>('ERC721');
  const [amount1155, setAmount1155] = useState<number>(1);
  const [maxSupply1155, setMaxSupply1155] = useState<number>(0);
  const [priceEth, setPriceEth] = useState<string>('');

  const handleFileUpload = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      setUploading(true);
      setUploadProgress(10);
      const cid = await uploadFileToIPFS(selectedFile);
      setUploadProgress(100);
      setUploading(false);
      setIpfsHash(cid);
      toast.success('File uploaded to IPFS successfully!');
    } catch (e: any) {
      setUploading(false);
      toast.error(e.message || 'IPFS upload failed');
    }
  };

  const handleMintAsset = async () => {
    try {
      if (!account) return toast.error('Connect wallet');
      if (!assetName || !ipfsHash) return toast.error('Fill required fields');
      
      const imageUrl = ipfsGatewayUrl(ipfsHash);
      const metadata = {
        name: assetName,
        description,
        image: imageUrl,
        attributes: [
          { trait_type: 'Legal ID', value: legalId },
          { trait_type: 'Asset ID', value: assetId },
          { trait_type: 'Transferable', value: isTransferable ? 'true' : 'false' }
        ],
        createdAt: Date.now()
      };

      const metaCid = await uploadJsonToIPFS(`${assetName}-metadata`, metadata);
      const metadataURI = ipfsUri(metaCid);

      if (tokenType === 'ERC721') {
        const result = await mintERC721Asset(account, metadataURI, assetName, description, ipfsHash, priceEth || undefined);
        if (result) {
          if (refreshBalance) await refreshBalance();
          toast.success('Asset Minted Successfully!');
          navigate('/dashboard'); // Redirect to My Assets
        }
      } else {
        const amt = Number(amount1155) || 1;
        const max = Number(maxSupply1155) || 0;
        const tx = await mintERC1155Asset(account, amt, assetName, description, ipfsHash, max);
        if (tx) {
          toast.success('Minting submitted');
          await tx.wait();
          if (refreshBalance) await refreshBalance();
          toast.success('ERC-1155 minted successfully!');
          navigate('/dashboard'); // Redirect to My Assets
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Mint failed');
    }
  };

  return (
    <div className="relative w-full min-h-full overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="w-full max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-10">
          <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] mb-8">Register & Mint New Asset</h1>
        
        <div className="space-y-8">
          <div className="bg-[#1A1F2E] border border-[#2A3441] rounded-xl p-8">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Step 1: Upload to IPFS</h2>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-[#3b4354] px-6 py-14 hover:border-[#00BFFF] transition-colors">
                <div className="flex max-w-[480px] flex-col items-center gap-2">
                  <p className="text-white text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">Drag and drop your file here</p>
                  <p className="text-[#A0A0A0] text-sm font-normal leading-normal max-w-[480px] text-center">Upload your asset to be stored on IPFS.</p>
                </div>
                <label className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#282e39] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#3b4354] transition-all">
                  <span className="truncate">Select File</span>
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>

              {uploading && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-6 justify-between"><p className="text-white text-base font-medium leading-normal">Uploading asset...</p></div>
                  <div className="rounded-full bg-[#3b4354] h-2"><div className="h-2 rounded-full bg-[#00BFFF]" style={{width: `${uploadProgress}%`}}></div></div>
                  <p className="text-[#A0A0A0] text-sm font-normal leading-normal">{file?.name}</p>
                </div>
              )}

              {ipfsHash && (
                <div>
                  <label className="block text-sm font-medium text-[#A0A0A0] mb-2">IPFS Content Identifier (CID)</label>
                  <div className="relative">
                    <input className="w-full rounded-lg pl-4 pr-12 py-2.5 text-sm font-mono bg-[#101622] border-[#3b4354] text-[#A0A0A0] cursor-not-allowed" readOnly type="text" value={ipfsHash} />
                    <button onClick={() => {navigator.clipboard.writeText(ipfsHash); toast.success('IPFS hash copied!');}} className="absolute inset-y-0 right-0 flex items-center px-3 text-[#A0A0A0] hover:text-white transition-colors" title="Copy CID">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 md:p-8 flex flex-col gap-6" style={{backgroundColor: 'rgba(16, 22, 34, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(40, 46, 57, 0.5)'}}>
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Step 2: Define Asset Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Asset Name</label>
                    <input className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0] focus:border-[#135bec] focus:ring-1 focus:ring-[#135bec]" placeholder="e.g. Real Estate Title Deed" type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Asset ID</label>
                    <input className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0] focus:border-[#135bec] focus:ring-1 focus:ring-[#135bec]" placeholder="Unique identifier" type="text" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Token Type</label>
                    <select className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0]" value={tokenType} onChange={(e) => setTokenType(e.target.value as any)}>
                      <option value="ERC721">ERC-721</option>
                      <option value="ERC1155">ERC-1155</option>
                    </select>
                  </div>
                  {tokenType === 'ERC1155' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Amount</label>
                        <input className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0]" type="number" min={1} value={amount1155} onChange={(e) => setAmount1155(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Max Supply (0 = unlimited)</label>
                        <input className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0]" type="number" min={0} value={maxSupply1155} onChange={(e) => setMaxSupply1155(Number(e.target.value))} />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[#A0A0A0] mb-2">Legal Identifier <span title="Enter the official legal reference number" className="cursor-help"><HelpCircle size={16} className="text-[#A0A0A0]" /></span></label>
                  <input className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0] focus:border-[#135bec] focus:ring-1 focus:ring-[#135bec]" placeholder="e.g. DEED-451-B-2024" type="text" value={legalId} onChange={(e) => setLegalId(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0A0] mb-2">Asset Description</label>
                  <textarea className="w-full rounded-lg p-2.5 text-sm resize-none bg-[#101622] border-[#3b4354] text-[#F0F0F0] focus:border-[#135bec] focus:ring-1 focus:ring-[#135bec]" placeholder="Provide a detailed description of the asset..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                </div>
                {tokenType === 'ERC721' && (
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0A0] mb-2">List Price (ETH) - Optional</label>
                    <input 
                      className="w-full rounded-lg p-2.5 text-sm bg-[#101622] border-[#3b4354] text-[#F0F0F0] focus:border-[#135bec] focus:ring-1 focus:ring-[#135bec]" 
                      placeholder="e.g. 0.1 (leave empty to mint without listing)" 
                      type="number" 
                      step="0.001" 
                      min="0"
                      value={priceEth} 
                      onChange={(e) => setPriceEth(e.target.value)} 
                    />
                    <p className="text-xs text-[#8D8D99] mt-1">If provided, asset will be automatically listed in marketplace</p>
                  </div>
                )}
                <div>
                  <label className="flex items-center gap-4 cursor-pointer">
                    <div className="relative inline-flex items-center">
                      <input checked={isTransferable} onChange={(e) => setIsTransferable(e.target.checked)} className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-[#3b4354] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                    <span className="text-sm font-medium text-white">Make Asset Transferable</span>
                  </label>
                </div>
              </div>
              <div className="md:col-span-1 flex justify-center items-center h-full">
                <div className="relative w-32 h-32">
                  <div className="absolute top-1/2 left-1/2 w-12 h-12 border border-[rgba(138,43,226,0.3)] rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-spin"></div>
                  <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-[rgba(138,43,226,0.3)] rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-spin" style={{animationDuration: '3s', animationDirection: 'reverse'}}></div>
                  <div className="absolute top-1/2 left-1/2 w-28 h-28 border border-[rgba(138,43,226,0.3)] rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-spin" style={{animationDuration: '4s'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button className="px-6 py-3 border border-[#2A3441] text-gray-400 rounded-lg hover:bg-[#2A3441] hover:text-white transition-colors">
              Save as Draft
            </button>
            <button 
              onClick={handleMintAsset}
              className="px-6 py-3 bg-[#00E0FF] text-[#0F1419] font-semibold rounded-lg hover:bg-[#00B8D9] transition-colors"
            >
              Mint Asset
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default MintAsset;