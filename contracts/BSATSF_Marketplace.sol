// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
 
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title BSATSF_Marketplace
 * @dev Simple marketplace for BSATSF ERC-721 assets: list for sale and purchase with ETH
 */
interface IBSATSF_ERC721 {
    function transferFee() external view returns (uint256);
    function transferAsset(address from, address to, uint256 tokenId) external payable;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

contract BSATSF_Marketplace is Ownable {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price; // in wei
        bool active;
    }

    address public erc721;
    mapping(uint256 => Listing) public listings;
    uint256[] public activeTokenIds;

    event Listed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event ListingCancelled(address indexed seller, uint256 indexed tokenId);
    event Purchased(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price, uint256 fee);

    constructor(address _erc721, address initialOwner) Ownable(initialOwner) {
        erc721 = _erc721;
    }

    function list(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be > 0");

        address owner = IBSATSF_ERC721(erc721).ownerOf(tokenId);
        require(owner == msg.sender, "Not token owner");

        // Require marketplace approval
        bool approved = (IBSATSF_ERC721(erc721).getApproved(tokenId) == address(this)) ||
                        IBSATSF_ERC721(erc721).isApprovedForAll(msg.sender, address(this));
        require(approved, "Marketplace not approved");

        listings[tokenId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });
        activeTokenIds.push(tokenId);

        emit Listed(msg.sender, tokenId, price);
    }

    function cancel(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.active, "Not listed");
        require(l.seller == msg.sender, "Not seller");

        listings[tokenId].active = false;
        emit ListingCancelled(msg.sender, tokenId);
    }

    function purchase(uint256 tokenId) external payable {
        Listing memory l = listings[tokenId];
        require(l.active, "Not listed");

        uint256 fee = IBSATSF_ERC721(erc721).transferFee();
        require(msg.value >= l.price + fee, "Insufficient payment");

        // Pay seller
        payable(l.seller).transfer(l.price);

        // Transfer asset to buyer and pay fee to ERC721 owner
        IBSATSF_ERC721(erc721).transferAsset{value: fee}(l.seller, msg.sender, tokenId);

        listings[tokenId].active = false;
        emit Purchased(msg.sender, l.seller, tokenId, l.price, fee);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeTokenIds.length; i++) {
            if (listings[activeTokenIds[i]].active) {
                count++;
            }
        }
        Listing[] memory results = new Listing[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < activeTokenIds.length; i++) {
            uint256 t = activeTokenIds[i];
            if (listings[t].active) {
                results[idx] = listings[t];
                idx++;
            }
        }
        return results;
    }
}
