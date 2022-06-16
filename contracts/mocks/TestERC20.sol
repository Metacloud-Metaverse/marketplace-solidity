// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract TestERC20 is ERC20 {
    constructor() ERC20("Test", "TST") {}

    function mintTo(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
