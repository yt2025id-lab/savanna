// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IReceiver
/// @notice Interface for Chainlink oracle report receiver (CRE / Keystone)
/// @dev Any contract receiving reports from Chainlink DON must implement this
interface IReceiver {
    /// @notice Called by the Chainlink Forwarder to deliver a report
    /// @param metadata Report metadata (workflow/run ID, config digest, etc.)
    /// @param report ABI-encoded report data
    function onReport(bytes calldata metadata, bytes calldata report) external;
}