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
    console.error("\nPlease create a .env file in the project root with:");
    console.error("PRIVATE_KEY=your_metamask_private_key_here");
    console.error("REACT_APP_INFURA_PROJECT_ID=your_infura_project_id");
    console.error("ETHERSCAN_API_KEY=your_etherscan_api_key (optional)\n");
    process.exit(1);
  }

  // Get the deployer account
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("No signers available. Please check your PRIVATE_KEY in .env file and network configuration.");
  }
  
  const deployer = signers[0];
  if (!deployer || !deployer.address) {
    throw new Error("Deployer account not available. Please check your PRIVATE_KEY in .env file.");
  }
  
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balance);
  console.log("Account balance:", balanceEth, "ETH");
  
  if (parseFloat(balanceEth) < 0.01) {
    console.warn("\n⚠️  WARNING: Low balance! You may not have enough ETH to deploy contracts.");
    console.warn("Please fund your account with Sepolia test ETH from a faucet.\n");
  }

  // Deploy ERC721 contract
  console.log("\nDeploying BSATSF_ERC721...");
  const ERC721 = await ethers.getContractFactory("BSATSF_ERC721");
  const erc721 = await ERC721.deploy(deployer.address);
  await erc721.waitForDeployment();
  console.log("ERC721 deployed to:", erc721.target);

  const ERC1155 = await ethers.getContractFactory("BSATSF_ERC1155");
  const erc1155 = await ERC1155.deploy(deployer.address);
  await erc1155.waitForDeployment();
  console.log("ERC1155 deployed to:", erc1155.target);

  // Deploy Marketplace (binds to ERC-721)
  const Marketplace = await ethers.getContractFactory("BSATSF_Marketplace");
  const marketplace = await Marketplace.deploy(erc721.target, deployer.address);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", marketplace.target);

  // Save contract addresses and ABIs
  const contractAddresses = {
    ERC721: erc721.target,
    ERC1155: erc1155.target,
    Marketplace: marketplace.target,
    network: hre.network.name,
    chainId: hre.network.config.chainId
  };

  // Create contracts directory in src
  const contractsDir = path.join(__dirname, "../public/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save addresses
  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(contractAddresses, null, 2)
  );

  // Save ABIs
  const erc721Artifact = await hre.artifacts.readArtifact("BSATSF_ERC721");
  const erc1155Artifact = await hre.artifacts.readArtifact("BSATSF_ERC1155");

  fs.writeFileSync(
    path.join(contractsDir, "BSATSF_ERC721.json"),
    JSON.stringify(erc721Artifact, null, 2)
  );

  fs.writeFileSync(
    path.join(contractsDir, "BSATSF_ERC1155.json"),
    JSON.stringify(erc1155Artifact, null, 2)
  );

  console.log("\nContract addresses and ABIs saved to src/contracts/");
  console.log("Deployment completed successfully!");

  // Verify contracts on Etherscan (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await erc721.deploymentTransaction().wait(6);
    await erc1155.deploymentTransaction().wait(6);

    console.log("Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: erc721.target,
        constructorArguments: [deployer.address],
      });
      console.log("ERC721 contract verified");
    } catch (error) {
      console.log("ERC721 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: erc1155.target,
        constructorArguments: [deployer.address],
      });
      console.log("ERC1155 contract verified");
    } catch (error) {
      console.log("ERC1155 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: marketplace.target,
        constructorArguments: [erc721.target, deployer.address],
      });
      console.log("Marketplace contract verified");
    } catch (error) {
      console.log("Marketplace verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
