// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IStrategy
/// @notice Interface for lending protocol strategy adapters
interface IStrategy {
    // ============ Events ============

    /// @notice Emitted when funds are deposited into the underlying protocol
    event Deposited(address indexed asset, uint256 amount);

    /// @notice Emitted when funds are withdrawn from the underlying protocol
    event Withdrawn(address indexed asset, uint256 amount, address recipient);

    /// @notice Emitted when strategy harvests yield
    event YieldHarvested(address indexed asset, uint256 amount);

    // ============ Actions ============

    /// @notice Deposit assets into the underlying lending protocol
    /// @param asset The ERC-20 token address to deposit
    /// @param amount The amount to deposit
    function deposit(address asset, uint256 amount) external;

    /// @notice Withdraw assets from the underlying lending protocol
    /// @param asset The ERC-20 token address to withdraw
    /// @param amount The amount to withdraw
    /// @param recipient Address to receive withdrawn funds
    /// @return withdrawn Actual amount withdrawn
    function withdraw(address asset, uint256 amount, address recipient) external returns (uint256 withdrawn);

    /// @notice Get the current balance in the underlying protocol
    /// @param asset The ERC-20 token address
    /// @return balance Current balance
    function getBalance(address asset) external view returns (uint256 balance);

    /// @notice Get the current APY of the underlying protocol
    /// @return apy APY in basis points
    function getApy() external view returns (uint256 apy);

    /// @notice Get the protocol name
    /// @return name Human-readable protocol name
    function protocolName() external pure returns (string memory name);
}