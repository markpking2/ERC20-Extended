// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MarkToken is ERC20 {
    address private immutable _owner;
    uint  private constant _mintAmount = 1000 * 10 ** 18;

    constructor() ERC20("Mark Token", "mTKN") {
        _mint(address(this), _mintAmount);
        _owner = msg.sender;
    }
}
