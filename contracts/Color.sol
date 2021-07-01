//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Color {
    uint256 private _red;
    uint256 private _green;
    uint256 private _blue;

    function setColor(
        uint256 red_,
        uint256 green_,
        uint256 blue_
    ) public {
        // protecton => seulement contrat gouvernance
        _red = red_;
        _green = green_;
        _blue = blue_;
    }
}
