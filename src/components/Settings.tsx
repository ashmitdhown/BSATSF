import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  User, Bell, Trash2, Save, Monitor, Wifi, Database, 
  Eye, EyeOff, LogOut 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  // 🔥 Get the LIVE value and function from Context
  const { 
    account, 
    disconnectWallet, 
    balanceEth, 
    isCorrectNetwork, 
    hideBalance, 
    toggleHideBalance 
  } = useWeb3();

  // Local settings (Profile only)
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  
  // Load local profile settings
  useEffect(() => {
    const savedName = localStorage.getItem('bsatsf_displayName');
    const savedEmail = localStorage.getItem('bsatsf_email');
    const savedNotifs = localStorage.getItem('bsatsf_notifications');

    if (savedName) setDisplayName(savedName);
    if (savedEmail) setEmail(savedEmail);
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('bsatsf_displayName', displayName);
    localStorage.setItem('bsatsf_email', email);
    toast.success("Profile settings saved locally");
  };

  const handleClearData = () => {
    if (window.confirm("This will clear all local app settings and cached data. Continue?")) {
      localStorage.clear();
      toast.success("App data cleared. Refreshing...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-4xl mx-auto px-6 md:px-8 lg:px-12 py-10">
          
          <div className="mb-10">
            <h1 className="text-white text-4xl font-black mb-2">Settings</h1>
            <p className="text-gray-400">Manage your preferences and application data.</p>
          </div>

          <div className="grid gap-8">
            
            {/* 1. Profile Section */}
            <section className="bg-[#1A1F2E] border border-[#2A3441] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] flex items-center gap-3">
                <User className="text-[#00E0FF]" size={24} />
                <h2 className="text-xl font-bold text-white">Profile Settings</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Display Name (Local)</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-3 text-white focus:border-[#00E0FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email (Optional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0F1419] border border-[#2A3441] rounded-lg px-4 py-3 text-white focus:border-[#00E0FF] focus:outline-none" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-gray-500">* Stored locally only.</p>
                  <button onClick={handleSaveProfile} className="flex items-center gap-2 bg-[#00E0FF] text-black font-bold px-6 py-2.5 rounded-lg hover:bg-[#00B8D9] transition-colors"><Save size={18} /> Save Profile</button>
                </div>
              </div>
            </section>

            {/* 2. Web3 Info */}
            <section className="bg-[#1A1F2E] border border-[#2A3441] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] flex items-center gap-3">
                <Wifi className="text-[#00E0FF]" size={24} />
                <h2 className="text-xl font-bold text-white">Wallet Connection</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-1">
                      <p className="text-sm text-gray-400">Connected Address</p>
                      <p className="text-white font-mono bg-[#0F1419] px-3 py-1 rounded border border-[#2A3441] inline-block">{account || "Not Connected"}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm text-gray-400">Balance</p>
                      {/* 🔥 USES GLOBAL STATE NOW */}
                      <p className="text-[#00E0FF] font-bold text-lg">
                        {hideBalance ? "•••• ETH" : `${balanceEth?.slice(0, 8)} ETH`}
                      </p>
                   </div>
                   <button onClick={disconnectWallet} className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"><LogOut size={18} /> Disconnect</button>
                </div>
              </div>
            </section>

            {/* 3. App Preferences */}
            <section className="bg-[#1A1F2E] border border-[#2A3441] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] flex items-center gap-3">
                <Monitor className="text-[#00E0FF]" size={24} />
                <h2 className="text-xl font-bold text-white">Preferences</h2>
              </div>
              <div className="p-6 space-y-4">
                
                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#0F1419] rounded-xl border border-[#2A3441]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                      {hideBalance ? <EyeOff size={24}/> : <Eye size={24}/>}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Privacy Mode</h3>
                      <p className="text-gray-400 text-sm">Hide wallet balances globally</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      // 🔥 BIND DIRECTLY TO CONTEXT
                      checked={hideBalance} 
                      onChange={toggleHideBalance} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E0FF]"></div>
                  </label>
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#0F1419] rounded-xl border border-[#2A3441]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Bell size={24}/></div>
                    <div><h3 className="text-white font-bold">Notifications</h3><p className="text-gray-400 text-sm">Enable toast notifications</p></div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notifications} onChange={() => { const newVal = !notifications; setNotifications(newVal); localStorage.setItem('bsatsf_notifications', JSON.stringify(newVal)); }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E0FF]"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* 4. Danger Zone */}
            <section className="bg-[#1A1F2E] border border-[#2A3441] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#2A3441] flex items-center gap-3">
                <Database className="text-red-500" size={24} />
                <h2 className="text-xl font-bold text-white">Data Management</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div><h3 className="text-white font-bold">Clear Application Data</h3><p className="text-gray-400 text-sm mt-1">This will remove your local profile settings and disconnect your wallet.</p></div>
                  <button onClick={handleClearData} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"><Trash2 size={18} /> Clear Data</button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;