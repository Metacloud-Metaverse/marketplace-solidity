// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;


interface IERC20 {
    function transferFrom(address from, address to, uint tokens) external returns (bool success);
    function balanceOf(address owner) external view returns (uint balance);
}

interface IERC721 {
    function ownerOf(uint256 _tokenId) external view returns (address _owner);
    function approve(address _to, uint256 _tokenId) external;
    function getApproved(uint256 _tokenId) external view returns (address);
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
    function transferFrom(address _from, address _to, uint256 _tokenId) external;
    function supportsInterface(bytes4) external view returns (bool);
}

contract MarketplaceStorage {
    IERC20 public acceptedToken;
    IERC721 public landContract;

    enum Status {
        Open,
        Executed,
        Cancelled
    }

    struct Order {
        uint256 assetId; // Asset ID
        address seller; // Owner of the NFT
        uint256 price; // Price (in wei) for the land
        Status status; // Status of the order
    }

    // Sales manager
    mapping (uint256 => Order) public landSales;
    // Mapping for avoid duplicated orders for the same NFT
    mapping (uint256 => bool) public assetIdToOrderOpen;
    uint256 public salesCounter;

    bytes4 public constant ERC721_Interface = bytes4(0x80ac58cd);

    // EVENTS
    event OrderCreated(
        uint256 id,
        uint256 indexed assetId,
        address indexed seller,
        uint256 priceInWei
    );
    event OrderSuccessful(
        uint256 id,
        uint256 indexed assetId,
        address indexed seller,
        uint256 priceInWei,
        address indexed buyer
    );
    event OrderCancelled(
        uint256 id,
        uint256 indexed assetId,
        address indexed seller
    );
}
