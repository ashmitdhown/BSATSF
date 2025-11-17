import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ChevronDown, Wallet, Check } from 'lucide-react';

const AccountSelector: React.FC = () => {
  const { account, accounts, switchAccount } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);

  const handleAccountSwitch = async (accountAddress: string) => {
    if (accountAddress !== account) {
      await switchAccount(accountAddress);
    }
    setIsOpen(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (accounts.length <= 1) {
    return null; // Don't show selector if only one account
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[rgba(20,25,40,0.6)] border border-white/10 rounded-lg hover:bg-[rgba(20,25,40,0.8)] transition-colors text-white"
      >
        <Wallet size={16} />
        <span className="text-sm font-mono">{formatAddress(account || '')}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-[rgba(20,25,40,0.95)] border border-white/10 rounded-lg shadow-2xl backdrop-blur-lg z-20">
            <div className="p-2">
              <div className="text-xs text-gray-400 px-2 py-1 mb-2">Select Account</div>
              {accounts.map((accountAddress, index) => (
                <button
                  key={accountAddress}
                  onClick={() => handleAccountSwitch(accountAddress)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[rgba(255,255,255,0.1)] transition-colors ${
                    accountAddress === account ? 'bg-[rgba(0,224,255,0.1)] border border-[rgba(0,224,255,0.2)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#00E0FF] to-[#FF00A8] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white text-sm font-mono">{formatAddress(accountAddress)}</div>
                      <div className="text-xs text-gray-400">Account {index + 1}</div>
                    </div>
                  </div>
                  {accountAddress === account && (
                    <Check size={16} className="text-[#00E0FF]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountSelector;
