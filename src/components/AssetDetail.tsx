import React from 'react';
import { useParams } from 'react-router-dom';

const AssetDetail: React.FC = () => {
  const { id } = useParams();
  
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#0F1419]">
      <div className="animate-grid absolute inset-0"></div>
      <div className="relative z-10 flex flex-col h-full grow">
        <main className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-10">
          <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] mb-8">Asset Details</h1>
          <div className="glass-card rounded-xl p-8">
            <p className="text-white text-lg">Asset ID: {id}</p>
            <p className="text-gray-400 mt-4">Detailed asset information and provenance timeline would be displayed here.</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AssetDetail;
