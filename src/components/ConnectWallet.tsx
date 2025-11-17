import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Link2Off } from 'lucide-react';

const ConnectWallet: React.FC = () => {
  const { connectWallet, isCorrectNetwork, switchToSepolia } = useWeb3();

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark text-[#E1E8F0] overflow-hidden">
      <div className="lattice-bg"></div>
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 px-4 sm:px-10 py-4">
              <div className="flex items-center gap-4 text-white">
                <div className="size-6">
                  <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fillRule="evenodd"></path>
                    <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fillRule="evenodd"></path>
                  </svg>
                </div>
                <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">BSATSF</h2>
              </div>
              <div className="flex min-w-[84px] cursor-default items-center justify-center overflow-hidden rounded-full h-8 px-4 bg-violet-500/20 text-violet-300 text-sm font-bold leading-normal tracking-[0.015em] border border-violet-500/50">
                <span className="truncate">Sepolia Testnet</span>
              </div>
            </header>
            <main className="flex flex-1 items-center justify-center py-10">
              <div className="w-full max-w-lg">
                <div className="flex flex-col items-center justify-start rounded-xl border border-white/10 bg-[rgba(20,25,40,0.6)] p-6 text-center shadow-2xl shadow-black/50 backdrop-blur-lg sm:p-8">
                  <Link2Off className="text-5xl text-gray-400 mb-4" size={80} />
                  <p className="text-white text-2xl font-bold leading-tight tracking-[-0.015em] mb-2">Connect Your Wallet</p>
                  <p className="text-gray-400 text-base font-normal leading-normal mb-6">
                    Please connect your MetaMask wallet to access the BSATSF dashboard. Ensure you are on the Sepolia testnet.
                  </p>
                  {!isCorrectNetwork && (
                    <button
                      onClick={switchToSepolia}
                      className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-orange-500 text-white text-base font-bold leading-normal shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-500/90 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-background-dark mb-4"
                    >
                      <span className="truncate">Switch to Sepolia</span>
                    </button>
                  )}
                  <button
                    onClick={connectWallet}
                    className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark"
                  >
                    <img 
                      alt="MetaMask Fox Logo" 
                      className="h-6 w-6" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSiPJPUm4c6aRIOA6S1Ia1RFdBo990bHVJOdQns9MLIOLXYwB-l6gX5HjouBvulfW5z_fEp_7whOboGBeEwPZXfrQFt8OSK8tDCPnSIS-OwWd0fFZUcNy2t4jigWUBsBsyUivK1P5367kmFtSjf7R5U3UMEnCF04zdNk7tqbsKADaDoXT7ZYYaHnwBHUG3eo73ifF1ei4QEi5tbRr2H9QiYNffIrPJY9Ps9CBEBieCuDp1ju_bO0DyanKsNzg_T-9Qr97db5fkx2g"
                    />
                    <span className="truncate">Connect with MetaMask</span>
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectWallet;
