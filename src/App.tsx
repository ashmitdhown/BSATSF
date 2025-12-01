import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useWeb3 } from './contexts/Web3Context';
import ConnectWallet from './components/ConnectWallet';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import MintAsset from './components/MintAsset';
import TransactionLedger from './components/TransactionLedger';
import TransferOwnership from './components/TransferOwnership';
import AssetDetail from './components/AssetDetail';
import VerifyAsset from './components/VerifyAsset';
import Settings from './components/Settings';
import Help from './components/Help';

function App() {
  const { account, isConnected } = useWeb3();

  // If wallet is not connected, redirect to connect page
  if (!isConnected || !account) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<ConnectWallet />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/connect" element={<Navigate to="/dashboard" replace />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/mint" element={<MintAsset />} />
              <Route path="/ledger" element={<TransactionLedger />} />
              <Route path="/transfer" element={<TransferOwnership />} />
              <Route path="/asset/:id" element={<AssetDetail />} />
              <Route path="/verify" element={<VerifyAsset />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} /> 
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;