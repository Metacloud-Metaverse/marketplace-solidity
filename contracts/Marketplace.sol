// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketplaceStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract Marketplace is Ownable, Pausable, MarketplaceStorage {
    using Address for address;
    using SafeMath for uint256;

    constructor (
        address _acceptedToken,
        address _landContract
    ) {
        // Verify that the land contract is a valid ERC721 contract
        require(_landContract.isContract(), 'The land contract address must be a deployed contract');
        landContract = IERC721(_landContract);

        // Verify that accepted token is a valid ERC20 token
        require(_acceptedToken.isContract(), 'The accepted token address must be a deployed contract');
        acceptedToken = IERC20(_acceptedToken);

        // Initialize the sales counter
        salesCounter = 0;
    }

    function createOrder(uint256 assetId, uint256 priceInWei) public whenNotPaused {
        // Verify that the asset id does not have an open order
        require(
            !assetIdToOrderOpen[assetId],
            'The asset already have an open order'
        );
        _createOrder(
            assetId,
            priceInWei
        );
    }

    function cancelOrder(uint256 _orderId) public whenNotPaused {
        _cancelOrder(_orderId);
    }

    function executeOrder(uint256 _orderId) public whenNotPaused {
        _executeOrder(_orderId);
    }

    function _createOrder(uint256 _assetId, uint256 _priceInWei) internal {
        address assetOwner = landContract.ownerOf(_assetId);

        require(_msgSender() == assetOwner, 'Only the owner can create orders');
        require(
            landContract.getApproved(_assetId) == address(this) || landContract.isApprovedForAll(assetOwner, address(this)),
            'The contract is not authorized to manage the asset'
        );
        require(_priceInWei > 0, 'Price should be bigger than 0');

        // Create the order on mapping
        landSales[salesCounter] = Order({
            assetId: _assetId,
            seller: assetOwner,
            price: _priceInWei,
            status: Status.Open
        });

        // Open the order related to asset ID (to avoid duplicates)
        assetIdToOrderOpen[_assetId] = true;

        // Increment the sales counter
        salesCounter += 1;

        emit OrderCreated(
            salesCounter - 1,
            _assetId,
            assetOwner,
            _priceInWei
        );
    }

    function _cancelOrder(uint256 _orderId) internal {
        // Get the order by id
        Order memory order = landSales[_orderId];

        require(assetIdToOrderOpen[order.assetId], 'The asset does not have an open order');
        // TODO: contract owner could cancel an order????
        require(order.seller == _msgSender() || _msgSender() == owner(), 'Unauthorized user');

        // Close the order related to asset ID
        delete assetIdToOrderOpen[order.assetId];
        // Change order status to Cancelled
        landSales[_orderId].status = Status.Cancelled;

        emit OrderCancelled(
            _orderId,
            order.assetId,
            order.seller // TODO: in case the order is cancelled by contract owner, change this
        );
    }

    function _executeOrder(uint256 _orderId) internal returns (Order memory) {
        address buyer = _msgSender();
        // Get the order by id
        Order memory order = landSales[_orderId];
        address seller = order.seller;

        require(assetIdToOrderOpen[order.assetId], 'The asset does not have an open order');
        require(seller != buyer, 'Unauthorized user');
        // TODO: waiting definition about gifting a land
        require(seller == landContract.ownerOf(order.assetId), 'The seller is no longer the owner');
        // Verify that the buyer has enough tokens
        require(acceptedToken.balanceOf(buyer) >= order.price, 'The buyer does not have enough tokens');

        // Close the order related to asset ID
        delete assetIdToOrderOpen[order.assetId];
        // Change order status to Executed
        landSales[_orderId].status = Status.Executed;

        // Transfer tokens to seller (needs previous approval)
        acceptedToken.transferFrom(buyer, seller, order.price);

        // Transfer asset to buyer (needs previous approval)
        landContract.transferFrom(seller, buyer, order.assetId);

        emit OrderSuccessful(
            _orderId,
            order.assetId,
            seller,
            order.price,
            buyer
        );

        return order;
    }
}