// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SavannaFaucet
/// @notice Testnet faucet for Savanna Finance on Celo Sepolia
/// @dev Distributes free test tokens (USDC, cbBTC, cbETH) once per 24h per user
contract SavannaFaucet is Ownable {
    using SafeERC20 for IERC20;

    struct FaucetToken {
        IERC20 token;
        uint256 amount;
        uint256 cooldown;
    }

    mapping(address => FaucetToken) public tokens;
    address[] public tokenList;
    mapping(address => mapping(address => uint256)) public lastClaim;

    event TokenClaimed(address indexed user, address indexed token, uint256 amount);
    event TokenAdded(address indexed token, uint256 amount, uint256 cooldown);
    event TokenUpdated(address indexed token, uint256 amount, uint256 cooldown);

    constructor(address owner_) Ownable(owner_) {}

    function addToken(address token, uint256 amount, uint256 cooldown) external onlyOwner {
        require(token != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        require(cooldown > 0, "Zero cooldown");
        tokens[token] = FaucetToken(IERC20(token), amount, cooldown);
        tokenList.push(token);
        emit TokenAdded(token, amount, cooldown);
    }

    function updateToken(address token, uint256 amount, uint256 cooldown) external onlyOwner {
        require(address(tokens[token].token) != address(0), "Token not registered");
        tokens[token] = FaucetToken(IERC20(token), amount, cooldown);
        emit TokenUpdated(token, amount, cooldown);
    }

    function claimMultiple(address[] calldata tokens_) external {
        for (uint256 i = 0; i < tokens_.length; i++) {
            _claim(tokens_[i]);
        }
    }

    function claim(address token) external {
        _claim(token);
    }

    function _claim(address token) internal {
        FaucetToken storage ft = tokens[token];
        require(address(ft.token) != address(0), "Token not supported");
        require(block.timestamp >= lastClaim[msg.sender][token] + ft.cooldown, "Cooldown active");
        require(ft.token.balanceOf(address(this)) >= ft.amount, "Faucet dry");

        lastClaim[msg.sender][token] = block.timestamp;
        ft.token.safeTransfer(msg.sender, ft.amount);

        emit TokenClaimed(msg.sender, token, ft.amount);
    }

    function getTokenCount() external view returns (uint256) {
        return tokenList.length;
    }

    function getTokenCooldown(address token, address user) external view returns (uint256 remaining) {
        uint256 nextAvailable = lastClaim[user][token] + tokens[token].cooldown;
        if (block.timestamp >= nextAvailable) return 0;
        return nextAvailable - block.timestamp;
    }

    function drip(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
