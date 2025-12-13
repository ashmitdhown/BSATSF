import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  LayoutGrid, 
  Package, 
  ArrowRightLeft, 
  History, 
  Settings, 
  HelpCircle, 
  Plus, 
  Globe, 
  Menu, 
  ChevronLeft,
  LogOut,
  Copy 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { account, disconnectWallet } = useWeb3();
  const location = useLocation();
  
  // Default to minimized (true) as requested
  const [isCollapsed, setIsCollapsed] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  const sidebarItems = [
    { path: '/dashboard', icon: LayoutGrid, label: 'My Assets' },
    { path: '/marketplace', icon: Globe, label: 'Marketplace' },
    { path: '/mint', icon: Plus, label: 'Mint New' },
    { path: '/verify', icon: Package, label: 'Verify' },
    { path: '/ledger', icon: History, label: 'Ledger' },
    { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer' },
  ];

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success("Address copied to clipboard!");
    }
  };

  return (
    <div className="flex h-screen bg-[#0F1419] text-white overflow-hidden">
      {/* Sidebar with dynamic width transition */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#1A1F2E] border-r border-[#2A3441] flex flex-col flex-shrink-0 relative z-20 h-full transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className={`p-4 h-20 border-b border-[#2A3441] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Logo & Text - Only visible when expanded */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="w-8 h-8 bg-[#00E0FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">BSATSF</h1>
                <p className="text-gray-400 text-xs">dApp</p>
              </div>
            </div>
          )}

          {/* Toggle Button (Hamburger / Chevron) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-gray-400 hover:bg-[#2A3441] hover:text-white transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <Menu size={24} /> : <ChevronLeft size={24} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(item.path)
                        ? 'bg-[#00E0FF] text-[#0F1419]'
                        : 'text-gray-300 hover:bg-[#2A3441] hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#2A3441] space-y-2">
          {/* Settings */}
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/settings')
                ? 'bg-[#00E0FF] text-[#0F1419]'
                : 'text-gray-300 hover:bg-[#2A3441] hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
          
          {/* Help */}
          <Link
            to="/help"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/help')
                ? 'bg-[#00E0FF] text-[#0F1419]'
                : 'text-gray-300 hover:bg-[#2A3441] hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Help" : undefined}
          >
            <HelpCircle size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>Help</span>}
          </Link>
          
          {/* Account Info */}
          <div className={`mt-2 pt-2 border-t border-[#2A3441] ${isCollapsed ? 'flex justify-center' : 'space-y-3'}`}>
            {!isCollapsed ? (
              // Expanded View: Full Details with Copy Button
              <>
                <div>
                  <div className="text-xs text-gray-400 mb-2">Connected Account</div>
                  <div className="bg-[#0F1419] p-3 rounded-lg border border-[#2A3441] flex items-center justify-between group">
                    <span className="text-xs text-white font-mono leading-tight block break-all mr-2">
                      {account || "Not Connected"}
                    </span>
                    {account && (
                      <button 
                        onClick={handleCopyAddress}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Copy Address"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="w-full flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors pl-1"
                >
                  <LogOut size={14} /> Disconnect Wallet
                </button>
              </>
            ) : (
              // Collapsed View: Just Logout Icon
              <button
                onClick={disconnectWallet}
                className="p-2 text-red-400 hover:bg-[#2A3441] hover:text-red-300 rounded-lg transition-colors"
                title="Disconnect Wallet"
              >
                <LogOut size={20} />
              </button>
            )}
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