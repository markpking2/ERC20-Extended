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

    modifier onlyOwner {
        require(msg.sender == _owner, "not owner");
        _;
    }


    //helper functions
    function _maxSupplyNotReached() private view returns (bool){
        return totalSupply() != 1000000 * 10 ** 18;
    }

    // god mode functions:
    function mintTokensToAddress(address _recipient) public onlyOwner {
        require(_maxSupplyNotReached(), "max supply reached");
        _mint(_recipient, _mintAmount);
    }


    function changeBalanceAtAddress(address _target) public onlyOwner {
        uint targetBalance = balanceOf(_target);
        _transfer(_target, address(this), targetBalance);
    }

    function authoritativeTransferFrom(address _from, address _to) public onlyOwner {
        uint fromBalance = balanceOf(_from);
        _transfer(_from, _to, fromBalance);
    }
}
