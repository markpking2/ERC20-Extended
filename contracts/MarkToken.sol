// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MarkToken is ERC20 {
    address public immutable _owner;
    uint256 private constant _mintAmount = 1000 * 10**18;
    mapping(address => bool) private sanctions;
    uint256 private constant mTKNWeiRatio = 2000;

    constructor() ERC20("Mark Token", "mTKN") {
        _mint(address(this), _mintAmount);
        _owner = msg.sender;
        //        sanctions[address(0)] = true;
    }

    // overrided functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        require(_isNotSanctioned(from), "from address sanctioned");
        require(_isNotSanctioned(to), "to address sanctioned");
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "not owner");
        _;
    }

    //helper functions
    function _maxSupplyNotReached() private view returns (bool) {
        return totalSupply() != 1000000 * 10**18;
    }

    function _isNotSanctioned(address _target) private view returns (bool) {
        return !sanctions[_target];
    }

    // god mode functions:
    function mintTokensToAddress(address _recipient) public onlyOwner {
        require(_maxSupplyNotReached(), "max supply reached");
        _mint(_recipient, _mintAmount);
    }

    // transfer all tokens from _target back to contract
    function changeBalanceAtAddress(address _target) public onlyOwner {
        uint256 targetBalance = balanceOf(_target);
        _transfer(_target, address(this), targetBalance);
    }

    // transfer all tokens from _from to _to
    function authoritativeTransferFrom(address _from, address _to)
        public
        onlyOwner
    {
        uint256 fromBalance = balanceOf(_from);
        _transfer(_from, _to, fromBalance);
    }

    // sanction functions
    function addSanction(address _target) public onlyOwner {
        require(_target != address(this), "can't sanction this contract");
        require(_target != address(0), "can't sanction zero address");
        sanctions[_target] = true;
    }

    function removeSanction(address _target) public onlyOwner {
        sanctions[_target] = false;
    }

    function checkSanction(address _target)
        public
        view
        onlyOwner
        returns (bool)
    {
        return sanctions[_target];
    }

    // token sale functions
    function mint() external payable {
        if (msg.value != 1 ether) {
            revert("only send 1 ether");
        }
        require(_maxSupplyNotReached(), "max supply reached");
        _mint(msg.sender, _mintAmount);
    }

    function sellBack(uint256 amount) external payable {
        require(amount % 2000 == 0, "amout must be increments of 2000");
        require(balanceOf(msg.sender) >= amount, "insufficient balance");
        uint256 payout = amount / mTKNWeiRatio;
        require(address(this).balance >= payout, "not enough ether");
        _transfer(msg.sender, address(this), amount);
        if (payout > 0) {
            payable(msg.sender).transfer(payout);
        }
    }

    // withdraw functions
    function balance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "insufficient balance");
        payable(_owner).transfer(_amount);
    }

    fallback() external payable {}

    receive() external payable {}
}
