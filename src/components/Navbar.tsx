import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import AccountSelector from './AccountSelector';

const Navbar: React.FC = () => {
  const { account, isConnected, disconnectWallet } = useWeb3();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[rgba(0,224,255,0.2)] px-6 md:px-10 lg:px-20 py-4 bg-[rgba(10,15,26,0.8)] backdrop-blur-lg">
      <div className="flex items-center gap-4">
        <div className="size-6 text-[#00E0FF]">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd"></path>
            <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd"></path>
          </svg>
        </div>
        <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">BSATSF</h2>
      </div>

      <nav className="flex items-center gap-6">
        <Link 
          to="/dashboard" 
          className={`text-sm font-medium transition-colors hover:text-[#00E0FF] ${
            isActive('/dashboard') ? 'text-[#00E0FF]' : 'text-white/70'
          }`}
        >
          Dashboard
        </Link>
        <Link 
          to="/mint" 
          className={`text-sm font-medium transition-colors hover:text-[#00E0FF] ${
            isActive('/mint') ? 'text-[#00E0FF]' : 'text-white/70'
          }`}
        >
          Mint Asset
        </Link>
        <Link 
          to="/ledger" 
          className={`text-sm font-medium transition-colors hover:text-[#00E0FF] ${
            isActive('/ledger') ? 'text-[#00E0FF]' : 'text-white/70'
          }`}
        >
          Ledger
        </Link>
        <Link 
          to="/transfer" 
          className={`text-sm font-medium transition-colors hover:text-[#00E0FF] ${
            isActive('/transfer') ? 'text-[#00E0FF]' : 'text-white/70'
          }`}
        >
          Transfer
        </Link>
        <Link 
          to="/verify" 
          className={`text-sm font-medium transition-colors hover:text-[#00E0FF] ${
            isActive('/verify') ? 'text-[#00E0FF]' : 'text-white/70'
          }`}
        >
          Verify
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="flex min-w-[84px] cursor-default items-center justify-center overflow-hidden rounded-full h-8 px-4 bg-violet-500/20 text-violet-300 text-sm font-bold leading-normal tracking-[0.015em] border border-violet-500/50">
              <span className="truncate">Sepolia</span>
            </div>
            <AccountSelector />
            <button 
              onClick={disconnectWallet}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <Link 
            to="/connect"
            className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Connect Wallet
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
