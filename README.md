# BSATSF

A blockchain asset management platform built with React, TypeScript, and Web3 integration.

## Features

- **MetaMask Integration** - Connect wallet with Sepolia testnet support
- **Asset Registry Dashboard** - Browse ERC-721 & ERC-1155 tokens with search/filter
- **Asset Minting** - IPFS file upload with drag-drop, metadata forms, animated token orbits
- **Transfer Ownership** - Wallet address validation with confirmation states
- **Transaction Ledger** - Filterable table with pagination and export functionality
- **Asset Verification** - Token ID/transaction hash lookup
- **Asset Detail View** - Individual asset pages with provenance timeline

## Tech Stack

- **React 18** with TypeScript for type safety
- **Ethers.js** for Web3 integration and MetaMask interaction
- **Tailwind CSS** for utility-first styling
- **React Router** for navigation between components
- **IPFS Integration** for decentralized file storage
- **React Hot Toast** for user notifications
- **Lucide React** for modern icons
- **Framer Motion** for smooth animations

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- Access to Sepolia testnet

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Provide contract addresses**

   Populate the following environment variables before running or building. The
   `generate-addresses` script will emit `public/contracts/addresses.json`
   automatically.
   ```bash
   export REACT_APP_ERC721_ADDRESS=0xYour721Address
   export REACT_APP_ERC1155_ADDRESS=0xYour1155Address
   export REACT_APP_MARKETPLACE_ADDRESS=0xYourMarketplace
   export REACT_APP_NETWORK_NAME=sepolia
   export REACT_APP_CHAIN_ID=11155111
   npm run generate:addresses   # optional; runs automatically before start/build
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

### Usage

1. **Connect MetaMask** - Click "Connect with MetaMask" button
2. **Switch to Sepolia** - Ensure you're on Sepolia testnet
3. **Browse Assets** - View tokenized assets in the dashboard
4. **Mint New Assets** - Upload files to IPFS and create new tokens
5. **Transfer Ownership** - Send assets to other wallet addresses
6. **View Transactions** - Monitor all blockchain transactions
7. **Verify Assets** - Lookup assets by token ID or transaction hash

## Project Structure

```
src/
├── components/           # React components
│   ├── ConnectWallet.tsx    # MetaMask connection
│   ├── Dashboard.tsx        # Asset registry grid
│   ├── MintAsset.tsx        # IPFS upload & minting
│   ├── TransactionLedger.tsx # Transaction history
│   ├── TransferOwnership.tsx # Asset transfers
│   ├── AssetDetail.tsx      # Individual asset view
│   └── VerifyAsset.tsx      # Asset verification
├── contexts/             # React contexts
│   └── Web3Context.tsx      # Web3 state management
├── App.tsx              # Main app component
├── index.tsx            # App entry point
└── index.css            # Global styles
```

## Design System

- **Color Palette**: Dark theme with cyan accents (#00E0FF, #00B8D9)
- **Typography**: Space Grotesk font family
- **Components**: Glass morphism effects with backdrop blur
- **Animations**: Token orbits, grid backgrounds, loading states
- **Responsive**: Mobile-first design with Tailwind breakpoints

## Web3 Integration

- **Wallet Connection**: MetaMask detection and connection
- **Network Validation**: Automatic Sepolia testnet verification
- **Smart Contracts**: ERC-721 and ERC-1155 token support
- **Transaction Handling**: Ethers.js for blockchain interactions
- **Error Handling**: User-friendly error messages and fallbacks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
