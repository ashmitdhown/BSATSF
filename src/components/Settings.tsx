import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">
          <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] mb-8">Settings</h1>
          <div className="glass-card rounded-xl p-8">
            <p className="text-gray-400 text-lg">Settings page coming soon...</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
