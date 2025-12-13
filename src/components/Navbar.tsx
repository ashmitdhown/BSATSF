import React from 'react';
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
  LogOut 
} from 'lucide-react';

interface NavbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isCollapsed, onToggle }) => {
  const { account, disconnectWallet } = useWeb3();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Define navigation items with their icons
  const sidebarItems = [
    { path: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { path: '/marketplace', icon: Globe, label: 'Marketplace' },
    { path: '/mint', icon: Plus, label: 'Mint Asset' },
    { path: '/verify', icon: Package, label: 'Verify' },
    { path: '/ledger', icon: History, label: 'Ledger' },
    { path: '/transfer', icon: ArrowRightLeft, label: 'Transfer' },
  ];

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#1A1F2E] border-r border-[#2A3441] flex flex-col flex-shrink-0 relative z-20 h-full transition-all duration-300 ease-in-out`}
    >
      {/* Header & Toggle */}
      <div className={`p-4 h-20 border-b border-[#2A3441] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {/* Logo - Only visible when expanded */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 bg-[#00E0FF] rounded-lg flex items-center justify-center flex-shrink-0">
              {/* BSATSF Logo SVG */}
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
                 <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd"></path>
                 <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">BSATSF</h1>
              <p className="text-gray-400 text-xs">dApp</p>
            </div>
          </div>
        )}

        {/* Hamburger / Toggle Button */}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-400 hover:bg-[#2A3441] hover:text-white transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <Menu size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>

      {/* Main Navigation Links */}
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

      {/* Footer Section */}
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
        
        {/* Account & Disconnect */}
        <div className={`mt-2 pt-2 border-t border-[#2A3441] ${isCollapsed ? 'flex justify-center' : 'space-y-3'}`}>
          {!isCollapsed ? (
            // Expanded View
            <>
              <div>
                <div className="text-xs text-gray-400 mb-2">Connected Account</div>
                <div className="bg-[#0F1419] p-3 rounded-lg border border-[#2A3441]">
                  <span className="text-xs text-white font-mono leading-tight block break-all">
                    {account || "Not Connected"}
                  </span>
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
            // Collapsed View
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
  );
};

export default Navbar;