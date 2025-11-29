// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BSATSF_ERC721
 * @dev ERC721 token for BSATSF blockchain asset management platform
 */
contract BSATSF_ERC721 is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Address for address payable;

    uint256 private _tokenIdCounter;
    
    // Transfer fee in wei (default 0.001 ETH)
    uint256 public transferFee = 0.001 ether;
    
    // Mapping from token ID to asset metadata
    mapping(uint256 => AssetMetadata) public assetMetadata;
    
    // Events
    event AssetMinted(uint256 indexed tokenId, address indexed to, string metadataURI);
    event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 fee);
    event TransferFeeUpdated(uint256 newFee);
    
    struct AssetMetadata {
        string name;
        string description;
        string ipfsHash;
        uint256 timestamp;
        address creator;
    }
    
    constructor(address initialOwner) ERC721("BSATSF Asset", "BSATSF") Ownable(initialOwner) {}
    
    /**
     * @dev Mint a new asset NFT
     * @param to Address to mint the token to
     * @param metadataURI IPFS URI for token metadata
     * @param name Asset name
     * @param description Asset description
     * @param ipfsHash IPFS hash of the asset file
     */
    function mintAsset(
        address to,
        string memory metadataURI,
        string memory name,
        string memory description,
        string memory ipfsHash
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        assetMetadata[tokenId] = AssetMetadata({
            name: name,
            description: description,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            creator: msg.sender
        });
        
        emit AssetMinted(tokenId, to, metadataURI);
        return tokenId;
    }
    
    /**
     * @dev Transfer asset with ETH fee
     */
    function transferAsset(address from, address to, uint256 tokenId) public payable nonReentrant {
        address tokenOwner = ownerOf(tokenId);
        require(
            _msgSender() == tokenOwner ||
            getApproved(tokenId) == _msgSender() ||
            isApprovedForAll(tokenOwner, _msgSender()),
            "Not approved or owner"
        );
        uint256 feeRequired = transferFee;
        require(msg.value >= feeRequired, "Insufficient transfer fee");

        _transfer(from, to, tokenId);

        if (feeRequired > 0) {
            payable(owner()).sendValue(feeRequired);
        }

        uint256 refund = msg.value - feeRequired;
        if (refund > 0) {
            payable(_msgSender()).sendValue(refund);
        }

        emit AssetTransferred(tokenId, from, to, feeRequired);
    }
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    /**
     * @dev Set transfer fee (only owner)
     */
    function setTransferFee(uint256 _fee) public onlyOwner {
        transferFee = _fee;
        emit TransferFeeUpdated(_fee);
    }
    
    /**
     * @dev Get asset metadata
     */
    function getAssetMetadata(uint256 tokenId) public view returns (AssetMetadata memory) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return assetMetadata[tokenId];
    }
    
    /**
     * @dev Get total number of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get all tokens owned by an address
     */
    function getTokensByOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (ownerOf(i) == owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return tokenIds;
    }
    
    
}
