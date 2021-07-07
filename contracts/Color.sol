//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Color is Ownable {
    uint8 private _red;
    uint8 private _green;
    uint8 private _blue;

    constructor(address owner_) Ownable() {
        transferOwnership(owner_);
    }

    function setColor(
        uint8 red_,
        uint8 green_,
        uint8 blue_
    ) public onlyOwner {
        _red = red_;
        _green = green_;
        _blue = blue_;
    }

    function seeRed() public view returns (uint8) {
        return _red;
    }

    function seeGreen() public view returns (uint8) {
        return _green;
    }

    function seeBlue() public view returns (uint8) {
        return _blue;
    }
}
