// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BSATSF_Marketplace is Ownable, ReentrancyGuard {
    
    // Counter for unique listing IDs
    uint256 private _listingIdCounter;

    struct Listing {
        uint256 listingId;
        address seller;
        address tokenAddress; // Is it the 721 or 1155 contract?
        uint256 tokenId;
        uint256 quantity;     // 1 for ERC721, N for ERC1155
        uint256 pricePerUnit; // Price per single item
        bool isERC1155;
        bool active;
    }

    address public immutable erc721Contract;
    address public immutable erc1155Contract;

    // Mapping from Listing ID -> Listing Details
    mapping(uint256 => Listing) public listings;

    event ItemListed(
        uint256 indexed listingId, 
        address indexed seller, 
        address indexed tokenAddress, 
        uint256 tokenId, 
        uint256 quantity, 
        uint256 pricePerUnit
    );

    event ItemCanceled(uint256 indexed listingId);

    event ItemSold(
        uint256 indexed listingId, 
        address indexed buyer, 
        address indexed tokenAddress, 
        uint256 tokenId, 
        uint256 quantity, 
        uint256 totalPrice
    );

    constructor(address _erc721, address _erc1155, address initialOwner) Ownable(initialOwner) {
        erc721Contract = _erc721;
        erc1155Contract = _erc1155;
    }

    // --- LISTING FUNCTIONS ---

    // List an ERC-721 Asset
    function listERC721(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be > 0");
        IERC721 token = IERC721(erc721Contract);
        
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            token.isApprovedForAll(msg.sender, address(this)) || token.getApproved(tokenId) == address(this), 
            "Marketplace not approved"
        );

        _listingIdCounter++;
        listings[_listingIdCounter] = Listing({
            listingId: _listingIdCounter,
            seller: msg.sender,
            tokenAddress: erc721Contract,
            tokenId: tokenId,
            quantity: 1,
            pricePerUnit: price,
            isERC1155: false,
            active: true
        });

        emit ItemListed(_listingIdCounter, msg.sender, erc721Contract, tokenId, 1, price);
    }

    // List an ERC-1155 Asset
    function listERC1155(uint256 tokenId, uint256 quantity, uint256 pricePerUnit) external nonReentrant {
        require(pricePerUnit > 0, "Price must be > 0");
        require(quantity > 0, "Quantity must be > 0");
        
        IERC1155 token = IERC1155(erc1155Contract);
        require(token.balanceOf(msg.sender, tokenId) >= quantity, "Insufficient balance");
        require(token.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        _listingIdCounter++;
        listings[_listingIdCounter] = Listing({
            listingId: _listingIdCounter,
            seller: msg.sender,
            tokenAddress: erc1155Contract,
            tokenId: tokenId,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            isERC1155: true,
            active: true
        });

        emit ItemListed(_listingIdCounter, msg.sender, erc1155Contract, tokenId, quantity, pricePerUnit);
    }

    // --- BUYING FUNCTIONS ---

    function buyItem(uint256 listingId, uint256 quantityToBuy) external payable nonReentrant {
        Listing storage listedItem = listings[listingId];
        require(listedItem.active, "Listing not active");
        require(quantityToBuy > 0 && quantityToBuy <= listedItem.quantity, "Invalid quantity");

        uint256 totalPrice = listedItem.pricePerUnit * quantityToBuy;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        // 1. Handle Payment
        // Optional: Deduct platform fee here if desired
        payable(listedItem.seller).transfer(listedItem.pricePerUnit * quantityToBuy);

        // 2. Transfer Asset
        if (listedItem.isERC1155) {
            IERC1155(erc1155Contract).safeTransferFrom(listedItem.seller, msg.sender, listedItem.tokenId, quantityToBuy, "");
        } else {
            // ERC-721 logic (Quantity is always 1)
            IERC721(erc721Contract).safeTransferFrom(listedItem.seller, msg.sender, listedItem.tokenId);
        }

        // 3. Update Listing State
        listedItem.quantity -= quantityToBuy;
        if (listedItem.quantity == 0) {
            listedItem.active = false;
        }

        emit ItemSold(listingId, msg.sender, listedItem.tokenAddress, listedItem.tokenId, quantityToBuy, totalPrice);

        // Refund excess ETH
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
    }

    // --- MANAGEMENT ---

    function cancelListing(uint256 listingId) external {
        Listing storage listedItem = listings[listingId];
        require(listedItem.seller == msg.sender, "Not seller");
        require(listedItem.active, "Not active");

        listedItem.active = false;
        emit ItemCanceled(listingId);
    }

    // --- VIEWS ---

    function getAllActiveListings() external view returns (Listing[] memory) {
        uint256 total = _listingIdCounter;
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }

        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (listings[i].active) {
                activeListings[currentIndex] = listings[i];
                currentIndex++;
            }
        }
        return activeListings;
    }
}