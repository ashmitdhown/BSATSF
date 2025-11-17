import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { LayoutGrid, Package, ArrowRightLeft, History, Settings, HelpCircle, Plus, Globe } from 'lucide-react';
import AccountSelector from './AccountSelector';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { account, disconnectWallet } = useWeb3();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const sidebarItems = [
    { path: '/dashboard', icon: LayoutGrid, label: 'My Assets' },
    { path: '/marketplace', icon: Globe, label: 'Marketplace' },
    { path: '/mint', icon: Plus, label: 'Mint New' },
    { path: '/verify', icon: Package, label: 'Verify' },
    { path: '/ledger', icon: History, label: 'Ledger' },
    { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer' },
  ];

  return (
    <div className="flex h-screen bg-[#0F1419] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 min-w-[16rem] max-w-[16rem] bg-[#1A1F2E] border-r border-[#2A3441] flex flex-col flex-shrink-0 relative z-20 h-full">
        {/* Header */}
        <div className="p-6 border-b border-[#2A3441]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00E0FF] rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">BSATSF</h1>
              <p className="text-gray-400 text-sm">dApp</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-[#00E0FF] text-[#0F1419]'
                        : 'text-gray-300 hover:bg-[#2A3441] hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-[#2A3441] space-y-2">
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/settings')
                ? 'bg-[#00E0FF] text-[#0F1419]'
                : 'text-gray-300 hover:bg-[#2A3441] hover:text-white'
            }`}
          >
            <Settings size={20} />
            Settings
          </Link>
          <Link
            to="/verify"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#2A3441] hover:text-white transition-colors"
          >
            <HelpCircle size={20} />
            Help
          </Link>
          
          {/* Account Info */}
          <div className="mt-4 pt-4 border-t border-[#2A3441] space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-2">Connected Account</div>
              <AccountSelector />
            </div>
            <button
              onClick={disconnectWallet}
              className="w-full text-xs text-gray-400 hover:text-white transition-colors text-left"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 w-0 overflow-auto relative h-full">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
