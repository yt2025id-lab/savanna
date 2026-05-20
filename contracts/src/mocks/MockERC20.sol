// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Mock stablecoin (cUSD) for testing on Celo Alfajores
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address recipient_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _mint(recipient_, initialSupply_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint tokens (testing only)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}