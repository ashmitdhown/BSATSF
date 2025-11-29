# Setup Instructions for Friend

## Steps to Deploy on Sepolia

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env File
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and add:
- `PRIVATE_KEY=your_metamask_private_key_here`
- Keep `SEPOLIA_RPC_URL=https://rpc.sepolia.org` (or add your own RPC)

### 3. Get Test ETH
Get Sepolia test ETH from a faucet:
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

### 4. Compile Contracts
```bash
npm run compile
```

### 5. Deploy to Sepolia
```bash
npm run deploy:sepolia
```

## Troubleshooting "ERC721 does not exist" Error

If you get this error during compilation:

1. **Clear cache and recompile**:
```bash
rm -rf cache/ artifacts/
npm run compile
```

2. **Check OpenZeppelin installation**:
```bash
npm install @openzeppelin/contracts@^5.0.0
```

3. **Verify Node.js version** (use v18+):
```bash
node --version
npm --version
```

4. **Clean install** (if issues persist):
```bash
rm -rf node_modules package-lock.json
npm install
npm run compile
```

## Common Issues

- **"Private key not found"**: Make sure `.env` file has `PRIVATE_KEY` set
- **"Insufficient balance"**: Get more Sepolia test ETH
- **"Network timeout"**: Try a different RPC URL in `.env`

## After Deployment

Contract addresses will be saved to `public/contracts/addresses.json` automatically.
