## Goal
Deliver a fully working, free-to-use blockchain dApp on Sepolia where users:
1) Connect via MetaMask and select accounts
2) Upload assets to IPFS, mint on-chain (ERC‑721/1155)
3) See assets in personal Dashboard and public Marketplace
4) List assets and purchase with ETH (fee + price)
5) Transfer ownership (ERC‑721) and view balances

## Features to Implement
- Wallet Connect: Keep current MetaMask flow with account switching and Sepolia network enforcement.
- IPFS Upload: Add web3.storage integration (free tier) to upload file + JSON metadata; store CID for on-chain mint.
- Minting:
  - ERC‑721: use `mintAsset(to, metadataURI, name, description, ipfsHash)` and write metadata URI (IPFS JSON) 
  - ERC‑1155: similar, with amount and maxSupply; show balances
- Dashboard: Show the connected user’s ERC‑721 and ERC‑1155 assets with images, names, tokenIds, balances.
- Marketplace:
  - Listing: input price in ETH; call `marketplace.list(tokenId, priceWei)`
  - Purchase: fetch listing, compute `value = price + fee`, call `purchase`; show receipts
  - Public visibility: assets from all known accounts rendered with details and IPFS link
- Transfer Ownership: ERC‑721 transfer via `transferAsset(from, to, tokenId)` including fee; validate addresses.
- Balances:
  - ETH balance: read via `provider.getBalance(account)` and display
  - ERC‑1155 balance: already surfaced; ensure display in UI

## Contract & Deployment
- Contracts (OZ v5, Solidity 0.8.20): ERC‑721 and ERC‑1155 mint, metadata, marketplace with price and fee handling.
- Fee logic: Marketplace pays seller price; ERC‑721 transfer charges fee to contract owner (kept minimal).
- Hardhat config: Sepolia network via Infura; compile + verify flow.
- Deploy script:
  - Ethers v6 (`waitForDeployment`, read `.target`)
  - Write `public/contracts/addresses.json` and ABIs for the frontend to auto-load
  - Optional Etherscan verification on Sepolia

## Frontend Implementation
- Web3Context: keep account switching and network checks; add `getBalance()` helper to show ETH balance.
- ContractContext: use Ethers v6 types and BigInt conversion; expose marketplace list/buy methods.
- MintAsset Page:
  - File upload to web3.storage; build metadata JSON; get CID
  - Choose ERC‑721 or ERC‑1155; call mint methods; show transaction and update UI
- Dashboard:
  - Load user assets via ContractContext; show ERC‑1155 balances and ETH balance
- Marketplace:
  - Add controls to list ERC‑721 and a buy button per item; show price (ETH), seller, active status
- TransferOwnership:
  - Keep ERC‑721 transfer flow; receipt display; refresh assets

## Verification Workflow
- Local
  - `npm run compile` to compile contracts
  - `npm run node` to start local Hardhat chain
  - `npm run deploy:local` to deploy and emit addresses.json/ABIs
  - `npm run dev` to run the CRA app and test full flows with MetaMask pointing to localhost
- Sepolia
  - Fund deployer and test accounts via faucet
  - `npm run deploy:sepolia` to deploy; confirm addresses.json present in `public/contracts`
  - Use MetaMask on Sepolia for real test transactions; verify on Etherscan

## Accounts to Create (Free)
- MetaMask: wallet for user, deployer, and test accounts
- Infura: free account/project to get Sepolia RPC (`REACT_APP_INFURA_PROJECT_ID`)
- Etherscan: free API key for contract verification (`ETHERSCAN_API_KEY`)
- web3.storage: free token to pin files and metadata to IPFS (`WEB3_STORAGE_TOKEN`)
- Optional: Pinata (alternative IPFS), Alchemy (alternative RPC)

## Environment & Config
- `.env` (root):
  - `REACT_APP_INFURA_PROJECT_ID=<your-infura-project-id>`
  - `PRIVATE_KEY=<deployer-private-key>`
  - `ETHERSCAN_API_KEY=<etherscan-key>`
  - `WEB3_STORAGE_TOKEN=<web3-storage-token>`
- MetaMask:
  - Add Sepolia network; ensure account funded via the faucet

## Data Model & UX Details
- Asset metadata JSON (stored on IPFS): `{ name, description, image, attributes, createdAt }`
- Display: image previews via IPFS gateway; show name/description/tokenId/creator/timestamps
- Listing UI: price input in ETH, toggle active; after list, show activity toasts
- Purchase: show pre-checks (active listing, sufficient balance), confirmation, receipt + Etherscan link
- Transfer: address validation, fee display, receipt, refresh asset lists

## Security & Cost Controls
- All operations are on Sepolia testnet (free faucet ETH)
- No secret logging; read env vars only
- Basic checks in UI for addresses and balances; error toasts
- Marketplace requires approval before listing to prevent unauthorized transfers

## Deliverables
- Working CRA app with MetaMask connect
- IPFS-backed minting producing visible assets
- Public marketplace with list/buy
- Ownership transfer (ERC‑721)
- Address and balances displayed; receipts linked to Etherscan

Confirm to proceed, and I will implement the IPFS upload integration, minting flows, marketplace listing/purchase UI, ETH balance display, and finalize deploy scripts and .env wiring for Sepolia.