const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying BSATSF contracts...");
  console.log("Network:", hre.network.name);

  // Check if PRIVATE_KEY is set
  if (!process.env.PRIVATE_KEY) {
    console.error("\n❌ ERROR: PRIVATE_KEY not found in .env file");
    process.exit(1);
  }

  // Get the deployer account
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // 1. Deploy ERC721 contract
  console.log("\nDeploying BSATSF_ERC721...");
  const ERC721 = await ethers.getContractFactory("BSATSF_ERC721");
  const erc721 = await ERC721.deploy(deployer.address);
  await erc721.waitForDeployment();
  console.log("ERC721 deployed to:", erc721.target);

  // 2. Deploy ERC1155 contract
  console.log("Deploying BSATSF_ERC1155...");
  const ERC1155 = await ethers.getContractFactory("BSATSF_ERC1155");
  const erc1155 = await ERC1155.deploy(deployer.address);
  await erc1155.waitForDeployment();
  console.log("ERC1155 deployed to:", erc1155.target);

  // 3. Deploy Marketplace 
  // 🔥 CHANGED: Now accepts BOTH token addresses
  console.log("Deploying BSATSF_Marketplace...");
  const Marketplace = await ethers.getContractFactory("BSATSF_Marketplace");
  const marketplace = await Marketplace.deploy(
      erc721.target, 
      erc1155.target, // <--- Added this argument
      deployer.address
  );
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", marketplace.target);

  // Save contract addresses
  const contractAddresses = {
    ERC721: erc721.target,
    ERC1155: erc1155.target,
    Marketplace: marketplace.target,
    network: hre.network.name,
    chainId: Number(hre.network.config.chainId)
  };

  // Create contracts directory
  const contractsDir = path.join(__dirname, "../public/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(contractAddresses, null, 2)
  );

  // Save ABIs
  const erc721Artifact = await hre.artifacts.readArtifact("BSATSF_ERC721");
  const erc1155Artifact = await hre.artifacts.readArtifact("BSATSF_ERC1155");
  const marketplaceArtifact = await hre.artifacts.readArtifact("BSATSF_Marketplace");

  fs.writeFileSync(path.join(contractsDir, "BSATSF_ERC721.json"), JSON.stringify(erc721Artifact, null, 2));
  fs.writeFileSync(path.join(contractsDir, "BSATSF_ERC1155.json"), JSON.stringify(erc1155Artifact, null, 2));
  fs.writeFileSync(path.join(contractsDir, "BSATSF_Marketplace.json"), JSON.stringify(marketplaceArtifact, null, 2));

  console.log("\nContract addresses and ABIs saved to src/contracts/");
  console.log("Deployment completed successfully!");

  // Verify contracts on Etherscan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    // Wait for 6 blocks to ensure Etherscan indexes the bytecode
    await erc721.deploymentTransaction().wait(6);
    await erc1155.deploymentTransaction().wait(6);
    await marketplace.deploymentTransaction().wait(6);

    console.log("Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: erc721.target,
        constructorArguments: [deployer.address],
      });
      console.log("ERC721 verified");
    } catch (e) { console.log("ERC721 verification error:", e.message); }

    try {
      await hre.run("verify:verify", {
        address: erc1155.target,
        constructorArguments: [deployer.address],
      });
      console.log("ERC1155 verified");
    } catch (e) { console.log("ERC1155 verification error:", e.message); }

    try {
      await hre.run("verify:verify", {
        address: marketplace.target,
        constructorArguments: [erc721.target, erc1155.target, deployer.address],
      });
      console.log("Marketplace verified");
    } catch (e) { console.log("Marketplace verification error:", e.message); }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });