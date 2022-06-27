// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./commons/IERC20.sol";
import "./commons/IERC721.sol";


contract MarketplaceStorage {
    IERC20 public acceptedToken;
    IERC721 public landContract;
    address public feeReceiver;
    uint256 public feePerThousand = 25; // 25 is 2,5 since 25/1000 = 0,025

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
    // Order counter
    uint256 public salesCounter;

    // Events
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
    event FeeChanged(
        uint256 previousFee,
        uint256 newFee
    );
    event FeeReceiverChanged(
        address previousFeeReceiver,
        address newFeeReceiver
    );
}
