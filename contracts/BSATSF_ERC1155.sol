// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
 

/**
 * @title BSATSF_ERC1155
 * @dev ERC1155 multi-token contract for BSATSF platform
 */
contract BSATSF_ERC1155 is ERC1155, Ownable {
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to asset metadata
    mapping(uint256 => AssetMetadata) public assetMetadata;
    
    // Mapping from token ID to total supply
    mapping(uint256 => uint256) public tokenSupply;
    
    // Events
    event AssetMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string metadataURI);
    event AssetBatchMinted(uint256[] tokenIds, address indexed to, uint256[] amounts);
    
    struct AssetMetadata {
        string name;
        string description;
        string ipfsHash;
        uint256 timestamp;
        address creator;
        uint256 maxSupply;
    }
    
    constructor(address initialOwner) ERC1155("https://api.bsatsf.com/metadata/{id}.json") Ownable(initialOwner) {}
    
    /**
     * @dev Mint new asset tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param name Asset name
     * @param description Asset description
     * @param ipfsHash IPFS hash of the asset file
     * @param maxSupply Maximum supply for this token (0 = unlimited)
     */
    function mintAsset(
        address to,
        uint256 amount,
        string memory name,
        string memory description,
        string memory ipfsHash,
        uint256 maxSupply
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        
        require(maxSupply == 0 || amount <= maxSupply, "Amount exceeds max supply");
        
        assetMetadata[tokenId] = AssetMetadata({
            name: name,
            description: description,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            creator: msg.sender,
            maxSupply: maxSupply
        });
        
        tokenSupply[tokenId] = amount;
        _mint(to, tokenId, amount, "");
        
        emit AssetMinted(tokenId, to, amount, string(abi.encodePacked("https://api.bsatsf.com/metadata/", _toString(tokenId), ".json")));
        return tokenId;
    }
    
    /**
     * @dev Mint additional tokens for existing asset
     */
    function mintAdditional(uint256 tokenId, address to, uint256 amount) public {
        require(_exists(tokenId), "Token does not exist");
        AssetMetadata memory metadata = assetMetadata[tokenId];
        require(msg.sender == metadata.creator || msg.sender == owner(), "Not authorized");
        
        if (metadata.maxSupply > 0) {
            require(tokenSupply[tokenId] + amount <= metadata.maxSupply, "Exceeds max supply");
        }
        
        tokenSupply[tokenId] += amount;
        _mint(to, tokenId, amount, "");
    }
    
    /**
     * @dev Batch mint multiple assets
     */
    function mintBatch(
        address to,
        uint256[] memory amounts,
        string[] memory names,
        string[] memory descriptions,
        string[] memory ipfsHashes,
        uint256[] memory maxSupplies
    ) public returns (uint256[] memory) {
        require(amounts.length == names.length, "Arrays length mismatch");
        require(amounts.length == descriptions.length, "Arrays length mismatch");
        require(amounts.length == ipfsHashes.length, "Arrays length mismatch");
        require(amounts.length == maxSupplies.length, "Arrays length mismatch");
        
        uint256[] memory tokenIds = new uint256[](amounts.length);
        
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter += 1;
            
            require(maxSupplies[i] == 0 || amounts[i] <= maxSupplies[i], "Amount exceeds max supply");
            
            assetMetadata[tokenId] = AssetMetadata({
                name: names[i],
                description: descriptions[i],
                ipfsHash: ipfsHashes[i],
                timestamp: block.timestamp,
                creator: msg.sender,
                maxSupply: maxSupplies[i]
            });
            
            tokenSupply[tokenId] = amounts[i];
            tokenIds[i] = tokenId;
        }
        
        _mintBatch(to, tokenIds, amounts, "");
        emit AssetBatchMinted(tokenIds, to, amounts);
        
        return tokenIds;
    }
    
    /**
     * @dev Get asset metadata
     */
    function getAssetMetadata(uint256 tokenId) public view returns (AssetMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return assetMetadata[tokenId];
    }
    
    /**
     * @dev Get total supply of a token
     */
    function totalSupply(uint256 tokenId) public view returns (uint256) {
        return tokenSupply[tokenId];
    }
    
    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenSupply[tokenId] > 0;
    }
    
    /**
     * @dev Get all tokens owned by an address with their balances
     */
    function getTokensByOwner(address owner) public view returns (uint256[] memory, uint256[] memory) {
        uint256 totalTokens = _tokenIdCounter;
        uint256[] memory tempTokenIds = new uint256[](totalTokens);
        uint256[] memory tempBalances = new uint256[](totalTokens);
        uint256 ownedCount = 0;
        
        for (uint256 i = 0; i < totalTokens; i++) {
            if (_exists(i)) {
                uint256 balance = balanceOf(owner, i);
                if (balance > 0) {
                    tempTokenIds[ownedCount] = i;
                    tempBalances[ownedCount] = balance;
                    ownedCount++;
                }
            }
        }
        
        // Create arrays with correct size
        uint256[] memory tokenIds = new uint256[](ownedCount);
        uint256[] memory balances = new uint256[](ownedCount);
        
        for (uint256 i = 0; i < ownedCount; i++) {
            tokenIds[i] = tempTokenIds[i];
            balances[i] = tempBalances[i];
        }
        
        return (tokenIds, balances);
    }
    
    /**
     * @dev Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
