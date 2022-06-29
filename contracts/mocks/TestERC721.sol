// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";


contract TestERC721 is ERC721Enumerable {
    constructor() ERC721("Test", "TST") {}

    function mintTo(address _to, uint256 _id) external {
        _mint(_to, _id);
    }
}
