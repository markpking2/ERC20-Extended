// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MarkToken is ERC20 {
    address private immutable _owner;
    uint  private constant _mintAmount = 1000 * 10 ** 18;
    mapping(address => bool) private sanctions;
    uint private constant mTKNWeiRatio = 2000;

    constructor() ERC20("Mark Token", "mTKN") {
        _mint(address(this), _mintAmount);
        _owner = msg.sender;
        sanctions[address(0)] = true;
    }

    modifier onlyOwner {
        require(msg.sender == _owner, "not owner");
        _;
    }


    //helper functions
    function _maxSupplyNotReached() private view returns (bool){
        return totalSupply() != 1000000 * 10 ** 18;
    }

    function _isNotSanctioned(address _target) private view returns (bool){
        return !sanctions[_target];
    }

    // god mode functions:
    function mintTokensToAddress(address _recipient) public onlyOwner {
        require(_maxSupplyNotReached(), "max supply reached");
        require(_isNotSanctioned(_recipient));
        _mint(_recipient, _mintAmount);
    }


    function changeBalanceAtAddress(address _target) public onlyOwner {
        require(_isNotSanctioned(_target));
        uint targetBalance = balanceOf(_target);
        _transfer(_target, address(this), targetBalance);
    }

    function authoritativeTransferFrom(address _from, address _to) public onlyOwner {
        require(_isNotSanctioned(_from));
        require(_isNotSanctioned(_to));
        uint fromBalance = balanceOf(_from);
        _transfer(_from, _to, fromBalance);
    }

    // sanction functions
    function addSanction(address _target) public onlyOwner {
        require(_target != address(this), "can't sanction this contract");
        sanctions[_target] = true;
    }

    function removeSanction(address _target) public onlyOwner {
        require(_target != address(0), "can't unsanction zero address");
        sanctions[_target] = false;
    }

    // token sale functions
    function mint() external payable {
        if(msg.value != 1 ether){
            revert("only send 1 ether");
        }else if(_isNotSanctioned(msg.sender)){
            revert("sanctioned");
        }
        require(_maxSupplyNotReached(), "max supply reached");
        _mint(msg.sender, _mintAmount);
    }

    function sellBack(uint amount) external payable {
        require(amount % 2000 == 0, "amout must be increments of 2000");
        require(balanceOf(msg.sender) > amount, "insufficient balance");
        uint payout = amount / mTKNWeiRatio;
        require(address(this).balance >= payout, "not enough ether");
        _transfer(msg.sender, address(this), amount);
        if(payout > 0){
            payable(msg.sender).transfer(payout);
        }
        
    }

    // withdraw functions
    function balance() external view onlyOwner returns (uint){
        return address(this).balance;
    }

    function withdraw(uint _amount) external onlyOwner {
        require(address(this).balance >= _amount, "insufficient balance");
        payable(_owner).transfer(_amount);
    }
}
