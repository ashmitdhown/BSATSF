import React, { useState } from 'react';
import {
    Book,
    Code,
    Terminal,
    Shield,
    Cpu,
    Layers,
    Globe,
    Wallet,
    FileText,
    Copy,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const Help: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'user' | 'dev'>('user');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const CodeBlock = ({ code }: { code: string }) => (
        <div className="relative group mt-2 mb-4">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => copyToClipboard(code)}
                    className="p-1.5 bg-[#2A3441] hover:bg-[#3b4354] rounded text-gray-300 hover:text-white"
                >
                    <Copy size={14} />
                </button>
            </div>
            <pre className="bg-[#0F1419] border border-[#2A3441] rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-300">
                {code}
            </pre>
        </div>
    );

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
            <div className="animate-grid absolute inset-0"></div>
            <div className="relative z-10 flex flex-col h-full grow">
                <main className="w-full max-w-5xl mx-auto px-6 md:px-10 lg:px-20 py-10">

                    <div className="mb-10 text-center">
                        <h1 className="text-white text-4xl font-black mb-4">Documentation & Help</h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Welcome to the BSATSF Platform. Whether you are a user looking to manage assets or a developer setting up the environment, you'll find everything you need here.
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-[#1A1F2E] p-1 rounded-xl border border-[#2A3441] flex">
                            <button
                                onClick={() => setActiveTab('user')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'user'
                                        ? 'bg-[#00E0FF] text-black shadow-[0_0_20px_rgba(0,224,255,0.3)]'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Book size={18} />
                                User Guide
                            </button>
                            <button
                                onClick={() => setActiveTab('dev')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'dev'
                                        ? 'bg-[#00E0FF] text-black shadow-[0_0_20px_rgba(0,224,255,0.3)]'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Code size={18} />
                                Developer Docs
                            </button>
                        </div>
                    </div>

                    {activeTab === 'user' ? (
                        <div className="space-y-8 animate-fade-in">
                            {/* Introduction */}
                            <div className="glass-card p-8 rounded-2xl border border-[#2A3441]">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                    <Globe className="text-[#00E0FF]" />
                                    Platform Overview
                                </h2>
                                <p className="text-gray-300 leading-relaxed">
                                    BSATSF is a comprehensive blockchain asset management platform built on the Sepolia Testnet.
                                    It allows users to tokenize real-world or digital assets into NFTs (ERC-721) or Multi-Tokens (ERC-1155),
                                    trade them on an open marketplace, and verify ownership immutably on the ledger.
                                </p>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { title: "MetaMask Integration", desc: "Connect securely with full Sepolia testnet support.", icon: Wallet },
                                    { title: "Asset Registry", desc: "Browse your personal collection of ERC-721 & ERC-1155 tokens.", icon: Layers },
                                    { title: "Minting Engine", desc: "Upload files to IPFS and mint tokens with drag-and-drop ease.", icon: FileText },
                                    { title: "Secure Transfers", desc: "Send assets to other wallets with built-in address validation.", icon: Shield },
                                    { title: "Public Marketplace", desc: "List your assets for sale or buy from others using ETH.", icon: Globe },
                                    { title: "Ledger History", desc: "Track every mint, transfer, and sale with Etherscan verification.", icon: Terminal }
                                ].map((feature, i) => (
                                    <div key={i} className="glass-card p-6 rounded-xl border border-[#2A3441] hover:border-[#00E0FF]/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-[#00E0FF]/10 rounded-lg text-[#00E0FF]">
                                                <feature.icon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                                                <p className="text-gray-400 text-sm">{feature.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* How to Use */}
                            <div className="glass-card p-8 rounded-2xl border border-[#2A3441]">
                                <h2 className="text-2xl font-bold text-white mb-6">How to Use</h2>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00E0FF] text-black font-bold flex items-center justify-center">1</div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">Connect Wallet</h4>
                                            <p className="text-gray-400 mt-1">Click "Connect Wallet" in the top right. Ensure you are on the <strong>Sepolia</strong> network.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2A3441] text-white font-bold flex items-center justify-center">2</div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">Get Test ETH</h4>
                                            <p className="text-gray-400 mt-1">You need SepoliaETH to pay for gas fees. Use a <a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" className="text-[#00E0FF] underline">Sepolia Faucet</a> to get free test funds.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2A3441] text-white font-bold flex items-center justify-center">3</div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">Mint an Asset</h4>
                                            <p className="text-gray-400 mt-1">Go to the "Mint New" page. Upload an image, add details, and confirm the transaction.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2A3441] text-white font-bold flex items-center justify-center">4</div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">Manage & Trade</h4>
                                            <p className="text-gray-400 mt-1">View your tokens in the Dashboard. You can Transfer them to a friend or List them on the Marketplace.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* Tech Stack */}
                            <div className="glass-card p-8 rounded-2xl border border-[#2A3441]">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Cpu className="text-[#00E0FF]" />
                                    Tech Stack
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['React 18', 'TypeScript', 'Ethers.js', 'Hardhat', 'Tailwind CSS', 'IPFS / Pinata', 'Solidity', 'OpenZeppelin'].map(tech => (
                                        <div key={tech} className="bg-[#0F1419] border border-[#2A3441] rounded-lg p-3 text-center text-gray-300 font-mono text-sm">
                                            {tech}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Installation Guide */}
                            <div className="glass-card p-8 rounded-2xl border border-[#2A3441]">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Terminal className="text-[#00E0FF]" />
                                    Deployment Guide
                                </h2>

                                <h3 className="text-white font-bold text-lg mb-2">1. Prerequisites</h3>
                                <ul className="list-disc list-inside text-gray-400 mb-6 space-y-1">
                                    <li>Node.js 16+</li>
                                    <li>MetaMask Browser Extension</li>
                                    <li>Sepolia RPC URL & Private Key</li>
                                </ul>

                                <h3 className="text-white font-bold text-lg mb-2">2. Installation</h3>
                                <CodeBlock code="npm install" />

                                <h3 className="text-white font-bold text-lg mb-2">3. Environment Setup</h3>
                                <p className="text-gray-400 mb-2">Create a <code className="text-[#00E0FF]">.env</code> file in the root directory:</p>
                                <CodeBlock code={`# Blockchain Credentials
PRIVATE_KEY=your_metamask_private_key
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# IPFS / Pinata
REACT_APP_PINATA_API_KEY=your_pinata_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret`} />

                                <h3 className="text-white font-bold text-lg mb-2">4. Smart Contract Deployment</h3>
                                <p className="text-gray-400 mb-2">Compile and deploy the ERC-721, ERC-1155, and Marketplace contracts to Sepolia.</p>
                                <CodeBlock code={`npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia`} />

                                <h3 className="text-white font-bold text-lg mb-2">5. Connect Frontend</h3>
                                <p className="text-gray-400 mb-2">Copy the addresses output from the deployment script into your <code className="text-[#00E0FF]">.env</code> file:</p>
                                <CodeBlock code={`REACT_APP_ERC721_ADDRESS=0x...
REACT_APP_ERC1155_ADDRESS=0x...
REACT_APP_MARKETPLACE_ADDRESS=0x...`} />

                                <h3 className="text-white font-bold text-lg mb-2">6. Run Application</h3>
                                <CodeBlock code="npm start" />
                            </div>

                            {/* Project Structure */}
                            <div className="glass-card p-8 rounded-2xl border border-[#2A3441]">
                                <h2 className="text-2xl font-bold text-white mb-6">Project Structure</h2>
                                <pre className="text-gray-400 font-mono text-sm leading-relaxed overflow-x-auto">
                                    {`src/
├── components/           # React UI Components
│   ├── Dashboard.tsx     # Main User Interface
│   ├── Marketplace.tsx   # Buying/Selling Logic
│   ├── MintAsset.tsx     # IPFS & Minting Logic
│   ├── TransactionLedger.tsx # History & Logs
│   └── ...
├── contexts/             # Global State
│   ├── Web3Context.tsx   # Wallet & Provider State
│   └── ContractContext.tsx # Smart Contract Interaction
├── contracts/            # Solidity Smart Contracts
│   ├── BSATSF_ERC721.sol
│   ├── BSATSF_ERC1155.sol
│   └── BSATSF_Marketplace.sol
└── scripts/              # Deployment Scripts`}
                                </pre>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

export default Help;