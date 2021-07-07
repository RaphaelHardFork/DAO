//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Color is Ownable {
    uint256 private _red;
    uint256 private _green;
    uint256 private _blue;

    constructor(address owner_) Ownable() {
        transferOwnership(owner_);
    }

    function setColor(
        uint256 red_,
        uint256 green_,
        uint256 blue_
    ) public onlyOwner {
        _red = red_;
        _green = green_;
        _blue = blue_;
    }

    function seeRed() public view returns (uint256) {
        return _red;
    }

    function seeGreen() public view returns (uint256) {
        return _green;
    }

    function seeBlue() public view returns (uint256) {
        return _blue;
    }
}
