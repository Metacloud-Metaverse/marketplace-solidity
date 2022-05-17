// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import "@openzeppelin/contracts/utils/Address.sol";

import "./MarketplaceStorage.sol";
import "../commons/Ownable.sol";
import "../commons/Pausable.sol";

contract Marketplace is Ownable, Pausable, MarketplaceStorage {
  using SafeMath for uint256;
  using Address for address;

  constructor (
    address _acceptedToken,
    address _owner
  )  {
    // EIP712 init
    _initializeEIP712('Metacloud Marketplace', '1');

    require(_owner != address(0), 'Invalid owner');
    transferOwnership(_owner);

    require(_acceptedToken.isContract(), 'The accepted token address must be a deployed contract');
    acceptedToken = ERC20Interface(_acceptedToken);
  }

  
  function createOrder(
    address nftAddress,
    uint256 assetId,
    uint256 priceInWei,
    uint256 expiresAt
  )
    public
    whenNotPaused
  {
    _createOrder(
      nftAddress,
      assetId,
      priceInWei,
      expiresAt
    );
  }

  function cancelOrder(address nftAddress, uint256 assetId) public whenNotPaused {
    _cancelOrder(nftAddress, assetId);
  }

  function safeExecuteOrder(
    address nftAddress,
    uint256 assetId,
    uint256 price,
    bytes memory fingerprint
  )
   public
   whenNotPaused
  {
    _executeOrder(
      nftAddress,
      assetId,
      price,
      fingerprint
    );
  }

  function executeOrder(
    address nftAddress,
    uint256 assetId,
    uint256 price
  )
   public
   whenNotPaused
  {
    _executeOrder(
      nftAddress,
      assetId,
      price,
      ''
    );
  }

  function _createOrder(
    address nftAddress,
    uint256 assetId,
    uint256 priceInWei,
    uint256 expiresAt
  )
    internal
  {
    _requireERC721(nftAddress);

    address sender = _msgSender();

    ERC721Interface nftRegistry = ERC721Interface(nftAddress);
    address assetOwner = nftRegistry.ownerOf(assetId);

    require(sender == assetOwner, 'Only the owner can create orders');
    require(
      nftRegistry.getApproved(assetId) == address(this) || nftRegistry.isApprovedForAll(assetOwner, address(this)),
      'The contract is not authorized to manage the asset'
    );
    require(priceInWei > 0, 'Price should be bigger than 0');
    require(expiresAt > block.timestamp.add(1 minutes), 'Publication should be more than 1 minute in the future');

    bytes32 orderId = keccak256(
      abi.encodePacked(
        block.timestamp,
        assetOwner,
        assetId,
        nftAddress,
        priceInWei
      )
    );

    orderByAssetId[nftAddress][assetId] = Order({
      id: orderId,
      seller: assetOwner,
      nftAddress: nftAddress,
      price: priceInWei,
      expiresAt: expiresAt
    });


    emit OrderCreated(
      orderId,
      assetId,
      assetOwner,
      nftAddress,
      priceInWei,
      expiresAt
    );
  }

  function _cancelOrder(address nftAddress, uint256 assetId) internal returns (Order memory) {
    address sender = _msgSender();
    Order memory order = orderByAssetId[nftAddress][assetId];

    require(order.id != 0, 'Asset not published');
    require(order.seller == sender || sender == owner(), 'Unauthorized user');

    bytes32 orderId = order.id;
    address orderSeller = order.seller;
    address orderNftAddress = order.nftAddress;
    delete orderByAssetId[nftAddress][assetId];

    emit OrderCancelled(
      orderId,
      assetId,
      orderSeller,
      orderNftAddress
    );

    return order;
  }

  function _executeOrder(
    address nftAddress,
    uint256 assetId,
    uint256 price,
    bytes memory fingerprint
  )
   internal returns (Order memory)
  {
    _requireERC721(nftAddress);

    address sender = _msgSender();

    ERC721Verifiable nftRegistry = ERC721Verifiable(nftAddress);

    if (nftRegistry.supportsInterface(InterfaceId_ValidateFingerprint)) {
      require(
        nftRegistry.verifyFingerprint(assetId, fingerprint),
        'The asset fingerprint is not valid'
      );
    }
    Order memory order = orderByAssetId[nftAddress][assetId];

    require(order.id != 0, 'Asset not published');

    address seller = order.seller;

    require(seller != address(0), 'Invalid address');
    require(seller != sender, 'Unauthorized user');
    require(order.price == price, 'The price is not correct');
    require(block.timestamp < order.expiresAt, 'The order expired');
    require(seller == nftRegistry.ownerOf(assetId), 'The seller is no longer the owner');

    uint saleShareAmount = 0;

    bytes32 orderId = order.id;
    delete orderByAssetId[nftAddress][assetId];

      // Transfer share amount for marketplace Owner
      require(
        acceptedToken.transferFrom(sender, owner(), saleShareAmount),
        'Transfering the cut to the Marketplace owner failed'
      );
    }

    // Transfer asset owner
    nftRegistry.safeTransferFrom(
      seller,
      sender,
      assetId
    );

    emit OrderSuccessful(
      orderId,
      assetId,
      seller,
      nftAddress,
      price,
      sender
    );

    return order;
  }

  function _requireERC721(address nftAddress) internal view {
    require(nftAddress.isContract(), 'The NFT Address should be a contract');

    ERC721Interface nftRegistry = ERC721Interface(nftAddress);
    require(
      nftRegistry.supportsInterface(ERC721_Interface),
      'The NFT contract has an invalid ERC721 implementation'
    );
  }
}