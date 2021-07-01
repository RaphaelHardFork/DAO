//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

contract GovernanceToken is ERC777 {
    constructor(
        uint256 totalSupply_,
        address owner_,
        address[] memory defaultOperators_
    ) ERC777("GovernanceToken", "GVT", defaultOperators_) {
        _mint(owner_, totalSupply_, "", "");
    }
}
