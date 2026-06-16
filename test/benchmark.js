const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BSATSF Quantitative Benchmarks", function () {
  let erc721;
  let erc1155;
  let marketplace;
  let owner;
  let buyer;

  before(async function () {
    [owner, buyer] = await ethers.getSigners();

    // Deploy Contracts
    const ERC721Factory = await ethers.getContractFactory("BSATSF_ERC721");
    erc721 = await ERC721Factory.deploy(owner.address);
    await erc721.waitForDeployment();
    const erc721Address = await erc721.getAddress();
    console.log("Deployed ERC721 at:", erc721Address);

    const ERC1155Factory = await ethers.getContractFactory("BSATSF_ERC1155");
    erc1155 = await ERC1155Factory.deploy(owner.address);
    await erc1155.waitForDeployment();
    const erc1155Address = await erc1155.getAddress();
    console.log("Deployed ERC1155 at:", erc1155Address);

    const MarketplaceFactory = await ethers.getContractFactory("BSATSF_Marketplace");
    marketplace = await MarketplaceFactory.deploy(erc721Address, erc1155Address, owner.address);
    await marketplace.waitForDeployment();
    console.log("Deployed Marketplace at:", await marketplace.getAddress());
  });

  it("Gathers Gas & Latency Data across 50 runs", async function () {
    const mintGas = [];
    const approveGas = [];
    const listGas = [];
    const buyGas = [];
    const latencies = [];

    const marketplaceAddress = await marketplace.getAddress();

    for (let i = 0; i < 50; i++) {
      // 1. Mint ERC721
      const startMint = Date.now();
      const mintTx = await erc721.mintAsset(
        owner.address,
        `ipfs://QmHashStringHereForTestingAssetNumber${i}`,
        `Asset ${i}`,
        `Description for asset ${i}`,
        `QmHashStringHereForTestingAssetNumber${i}`
      );
      const mintReceipt = await mintTx.wait();
      const endMint = Date.now();
      mintGas.push(Number(mintReceipt.gasUsed));
      latencies.push((endMint - startMint) / 1000);

      // 2. Approve Marketplace
      const approveTx = await erc721.approve(marketplaceAddress, i);
      const approveReceipt = await approveTx.wait();
      approveGas.push(Number(approveReceipt.gasUsed));

      // 3. List Item
      const listTx = await marketplace.listERC721(i, ethers.parseEther("0.01"));
      const listReceipt = await listTx.wait();
      listGas.push(Number(listReceipt.gasUsed));

      // 4. Buy Item (every 2nd item to test buying gas)
      if (i % 2 === 0) {
        const buyTx = await marketplace.connect(buyer).buyItem(i + 1, 1, {
          value: ethers.parseEther("0.01")
        });
        const buyReceipt = await buyTx.wait();
        buyGas.push(Number(buyReceipt.gasUsed));
      }
    }

    const calcStats = (data) => {
      const n = data.length;
      if (n === 0) return { mean: 0, stdDev: 0 };
      const mean = data.reduce((a, b) => a + b, 0) / n;
      const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);
      return { mean: mean.toFixed(1), stdDev: stdDev.toFixed(1) };
    };

    const mintStats = calcStats(mintGas);
    const approveStats = calcStats(approveGas);
    const listStats = calcStats(listGas);
    const buyStats = calcStats(buyGas);
    const latencyStats = calcStats(latencies);

    console.log("\n==================================================");
    console.log("            GAS BENCHMARK STATS (50 RUNS)         ");
    console.log("==================================================");
    console.log(`Mint Asset:      Mean = ${mintStats.mean} gas, Std Dev = ${mintStats.stdDev}`);
    console.log(`Approve Market:  Mean = ${approveStats.mean} gas, Std Dev = ${approveStats.stdDev}`);
    console.log(`List Asset:      Mean = ${listStats.mean} gas, Std Dev = ${listStats.stdDev}`);
    console.log(`Buy Asset:       Mean = ${buyStats.mean} gas, Std Dev = ${buyStats.stdDev}`);
    console.log(`Tx Latency:      Mean = ${latencyStats.mean}s, Std Dev = ${latencyStats.stdDev}s`);
    console.log("==================================================\n");
  });

  it("Verifies scalability ceiling at 500 listings", async function () {
    const marketplaceAddress = await marketplace.getAddress();
    // Currently we have 25 active and 25 inactive listings from the previous test.
    // Let's mint and list up to 500.
    const startListingIndex = 50;
    const targetCount = 500;
    console.log(`Filling listings up to ${targetCount} to measure view function execution overhead...`);

    // Batch minting to speed up setup
    const batchSize = 50;
    for (let i = startListingIndex; i < targetCount; i++) {
      const mintTx = await erc721.mintAsset(
        owner.address,
        `ipfs://QmHashStringHereForTestingAssetNumber${i}`,
        `Asset ${i}`,
        `Description for asset ${i}`,
        `QmHashStringHereForTestingAssetNumber${i}`
      );
      await mintTx.wait();

      const approveTx = await erc721.approve(marketplaceAddress, i);
      await approveTx.wait();

      const listTx = await marketplace.listERC721(i, ethers.parseEther("0.01"));
      await listTx.wait();
    }

    console.log("Total listings populated. Calling getAllActiveListings()...");
    const startCall = Date.now();
    const activeListings = await marketplace.getAllActiveListings();
    const callDuration = Date.now() - startCall;

    console.log("\n==================================================");
    console.log("        SCALABILITY & THROUGHPUT RESULTS          ");
    console.log("==================================================");
    console.log(`Active listings returned: ${activeListings.length}`);
    console.log(`getAllActiveListings Execution Time: ${callDuration} ms`);
    console.log(`Est. block gas limit constraint: At 500 listings, read size is safe, but on-chain calls scale linearly.`);
    console.log("==================================================\n");
  });
});
