// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FunctionsClient} from "@chainlink/contracts/functions/v1_3_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISavannaController} from "../interfaces/ISavannaController.sol";
import {ISavannaVault} from "../interfaces/ISavannaVault.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title SavannaFunctionsConsumer
/// @notice Chainlink Functions consumer that requests AI strategy recommendations
/// @dev Receives user strategy requests, sends them to Chainlink DON for AI analysis,
///      then forwards the result to SavannaController for execution.
///
/// Flow:
///   1. User calls vault.requestStrategy(timeHorizon) → emits StrategyRequested
///   2. Off-chain monitor detects event → calls consumer.requestAIStrategy(user, timeHorizon)
///   3. Chainlink DON executes source.js → compares APYs from Aave/Moola/Reserve
///   4. DON returns result → fulfillRequest() decodes and calls controller.onReport()
///   5. Controller validates and executes vault.executeStrategy()
contract SavannaFunctionsConsumer is FunctionsClient, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ State ============

    /// @notice SavannaController address
    address public controller;
    /// @notice SavannaVault address
    address public vault;

    /// @notice Chainlink Functions subscription ID
    uint64 public subscriptionId;
    /// @notice Gas limit for DON callback
    uint32 public callbackGasLimit;
    /// @notice DON ID for the target network
    bytes32 public donId;

    /// @notice JavaScript source code (inline) for AI strategy analysis
    string public sourceCode;

    /// @notice Track pending requests: requestId => user address
    mapping(bytes32 => address) public pendingRequests;
    /// @notice Track request params: requestId => timeHorizon
    mapping(bytes32 => uint256) public requestTimeHorizons;
    /// @notice Total AI requests sent
    uint256 public totalRequestsSent;
    /// @notice Total AI responses received
    uint256 public totalResponsesReceived;
    /// @notice x402 payment endpoint URL for off-chain AI analysis
    string public x402Endpoint;
    /// @notice x402 payment required per request (in USDC base units)
    uint256 public x402PricePerRequest;
    /// @notice Whether x402 payment is required before AI requests
    bool public x402Enabled;
    /// @notice Track x402 payments: requestId => paymentVerified
    mapping(bytes32 => bool) public x402PaymentVerified;
    /// @notice Track x402 pre-payment status: prelimId => paid
    mapping(bytes32 => bool) public x402PrePaid;
    /// @notice Track x402 pre-payment requests: prelimId => user
    mapping(bytes32 => address) public x402PrePayUser;
    /// @notice Track x402 pre-payment params: prelimId => timeHorizon
    mapping(bytes32 => uint256) public x402PrePayTimeHorizon;

    // ============ Events ============

    event AIRequestSent(bytes32 indexed requestId, address indexed user, uint256 timeHorizon);
    event AIResponseReceived(
        bytes32 indexed requestId,
        address indexed user,
        DataTypes.Protocol protocol,
        uint256 allocationBps,
        uint256 expectedApy,
        uint8 riskScore
    );
    event AIRequestFailed(bytes32 indexed requestId, string reason);
    event SourceCodeUpdated();
    event SubscriptionUpdated(uint64 oldSubId, uint64 newSubId);
    event DonIdUpdated(bytes32 oldDonId, bytes32 newDonId);
    event ControllerUpdated(address oldController, address newController);
    event CallbackGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event X402EndpointUpdated(string oldEndpoint, string newEndpoint);
    event X402PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event X402StatusUpdated(bool enabled);
    event X402PaymentVerified(bytes32 indexed requestId, address indexed user);
    event X402PaymentRequested(bytes32 indexed requestId, address indexed user, uint256 price);

    // ============ Constructor ============

    constructor(
        address router_,
        address controller_,
        address vault_,
        uint64 subscriptionId_,
        bytes32 donId_,
        address owner_
    ) FunctionsClient(router_) Ownable(owner_) {
        if (controller_ == address(0) || vault_ == address(0)) {
            revert Errors.Savanna__ZeroAddress();
        }
        controller = controller_;
        vault = vault_;
        subscriptionId = subscriptionId_;
        donId = donId_;
        callbackGasLimit = 300_000; // Default gas for callback
    }

    // ============ AI Request ============

    /// @notice Send AI strategy request to Chainlink DON
    /// @param user The user address requesting a strategy
    /// @param timeHorizon Investment duration in seconds
    /// @return requestId The Chainlink Functions request ID
    // forge-lint: disable-next-line(mixed-case-function) — AI is an acronym, not mixed case
    function requestAIStrategy(address user, uint256 timeHorizon)
        external
        returns (bytes32 requestId)
    {
        // Only vault or owner can trigger AI analysis
        if (msg.sender != vault && msg.sender != owner()) {
            revert Errors.Savanna__Unauthorized();
        }

        // Validate user has an active request in the vault
        if (!ISavannaVault(vault).hasActiveRequest(user)) {
            revert Errors.Savanna__NoActiveRequest();
        }

        // Build the Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);

        // Pass args: user address (hex string) and timeHorizon (decimal string)
        string[] memory args = new string[](2);
        args[0] = _addressToString(user);
        args[1] = _uintToString(timeHorizon);
        req.setArgs(args);

        // Send request to DON
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            callbackGasLimit,
            donId
        );

        // Track pending request
        pendingRequests[requestId] = user;
        requestTimeHorizons[requestId] = timeHorizon;
        totalRequestsSent++;

        emit AIRequestSent(requestId, user, timeHorizon);
    }

    // forge-lint: disable-next-line(mixed-case-function) — AI is an acronym, not mixed case
    function requestAIStrategyWithPayment(address user, uint256 timeHorizon)
        external
        returns (bytes32 prelimId)
    {
        if (!x402Enabled) revert Errors.Savanna__X402PaymentRequired();
        if (msg.sender != vault && msg.sender != owner()) {
            revert Errors.Savanna__Unauthorized();
        }
        if (!ISavannaVault(vault).hasActiveRequest(user)) {
            revert Errors.Savanna__NoActiveRequest();
        }

        prelimId = keccak256(abi.encode(user, timeHorizon, block.number));
        x402PrePaid[prelimId] = false;
        x402PrePayUser[prelimId] = user;
        x402PrePayTimeHorizon[prelimId] = timeHorizon;

        emit X402PaymentRequested(prelimId, user, x402PricePerRequest);
    }

    function confirmAndSendRequest(bytes32 prelimId) external onlyOwner {
        if (x402PrePayUser[prelimId] == address(0)) revert Errors.Savanna__X402PaymentNotConfirmed();
        if (x402PrePaid[prelimId]) revert Errors.Savanna__X402PaymentNotConfirmed();

        x402PrePaid[prelimId] = true;

        emit X402PaymentVerified(prelimId, x402PrePayUser[prelimId]);
    }

    function sendPaidRequest(bytes32 prelimId) external onlyOwner {
        if (!x402PrePaid[prelimId]) revert Errors.Savanna__X402PaymentNotConfirmed();

        address user = x402PrePayUser[prelimId];
        uint256 timeHorizon = x402PrePayTimeHorizon[prelimId];

        delete x402PrePayUser[prelimId];
        delete x402PrePayTimeHorizon[prelimId];
        delete x402PrePaid[prelimId];

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(sourceCode);

        string[] memory args = new string[](2);
        args[0] = _addressToString(user);
        args[1] = _uintToString(timeHorizon);
        req.setArgs(args);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            callbackGasLimit,
            donId
        );

        pendingRequests[requestId] = user;
        requestTimeHorizons[requestId] = timeHorizon;
        totalRequestsSent++;

        emit AIRequestSent(requestId, user, timeHorizon);
    }

    // ============ DON Callback ============

    /// @notice Called by Chainlink Functions Router when DON completes execution
    /// @param requestId The request ID
    /// @param response The CBOR-encoded response from DON
    /// @param err Error bytes if execution failed
    function _fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err)
        internal
        override
    {
        address user = pendingRequests[requestId];
        if (user == address(0)) return; // Unknown request, ignore

        // Clean up pending state
        delete pendingRequests[requestId];
        delete requestTimeHorizons[requestId];

        // Handle error from DON
        if (err.length > 0) {
            string memory errorMsg = string(err);
            emit AIRequestFailed(requestId, errorMsg);
            return;
        }

        if (response.length == 0) {
            emit AIRequestFailed(requestId, "Empty response from DON");
            return;
        }

        // Decode the AI recommendation from DON
        // Expected format: abi.encode(uint8 protocolId, uint256 allocationBps, uint256 expectedApy, uint8 riskScore)
        (
            uint8 protocolId,
            uint256 allocationBps,
            uint256 expectedApy,
            uint8 riskScore
        ) = abi.decode(response, (uint8, uint256, uint256, uint8));

        DataTypes.Protocol protocol = DataTypes.Protocol(protocolId);

        totalResponsesReceived++;

        emit AIResponseReceived(requestId, user, protocol, allocationBps, expectedApy, riskScore);

        // Forward recommendation to controller for execution
        // The controller's onReport expects (user, protocolId, allocationBps, expectedApy, reasoning)
        // We build the report ABI-encoded
        bytes memory report = abi.encode(user, protocolId, allocationBps, expectedApy, "Chainlink Functions AI");

        // Call controller — this triggers vault.executeStrategy internally
        // Note: This contract must be set as the forwarder on the controller
        try ISavannaController(controller).onReport("", report) {
            // Success
        } catch (bytes memory reason) {
            // Controller rejected — emit failure but don't revert (DON callback must not revert)
            emit AIRequestFailed(requestId, _getRevertReason(reason));
        }
    }

    // ============ Admin ============

    /// @notice Update the JavaScript source code for AI analysis
    function setSourceCode(string calldata newSource) external onlyOwner {
        sourceCode = newSource;
        emit SourceCodeUpdated();
    }

    /// @notice Update the Chainlink Functions subscription ID
    function setSubscriptionId(uint64 newSubId) external onlyOwner {
        uint64 oldSubId = subscriptionId;
        subscriptionId = newSubId;
        emit SubscriptionUpdated(oldSubId, newSubId);
    }

    /// @notice Update the DON ID
    function setDonId(bytes32 newDonId) external onlyOwner {
        bytes32 oldDonId = donId;
        donId = newDonId;
        emit DonIdUpdated(oldDonId, newDonId);
    }

    /// @notice Update the controller address
    function setController(address newController) external onlyOwner {
        if (newController == address(0)) revert Errors.Savanna__ZeroAddress();
        address oldController = controller;
        controller = newController;
        emit ControllerUpdated(oldController, newController);
    }

    /// @notice Update callback gas limit
    function setCallbackGasLimit(uint32 newLimit) external onlyOwner {
        uint32 oldLimit = callbackGasLimit;
        callbackGasLimit = newLimit;
        emit CallbackGasLimitUpdated(oldLimit, newLimit);
    }

    /// @notice Set the x402 payment endpoint URL
    function setX402Endpoint(string calldata endpoint) external onlyOwner {
        string memory old = x402Endpoint;
        x402Endpoint = endpoint;
        emit X402EndpointUpdated(old, endpoint);
    }

    /// @notice Set x402 price per AI request (in USDC base units, 6 decimals)
    function setX402PricePerRequest(uint256 price) external onlyOwner {
        uint256 oldPrice = x402PricePerRequest;
        x402PricePerRequest = price;
        emit X402PriceUpdated(oldPrice, price);
    }

    /// @notice Enable or disable x402 payment requirement
    function setX402Enabled(bool enabled) external onlyOwner {
        x402Enabled = enabled;
        emit X402StatusUpdated(enabled);
    }

    /// @notice Verify x402 payment for a request (called by off-chain monitor after payment confirmed)
    function verifyX402Payment(bytes32 requestId) external onlyOwner {
        if (pendingRequests[requestId] == address(0)) revert Errors.Savanna__NoActiveRequest();
        x402PaymentVerified[requestId] = true;
        emit X402PaymentVerified(requestId, pendingRequests[requestId]);
    }

    // ============ View ============

    /// @notice Get pending request info
    function getPendingRequest(bytes32 requestId)
        external
        view
        returns (address user, uint256 timeHorizon)
    {
        user = pendingRequests[requestId];
        timeHorizon = requestTimeHorizons[requestId];
    }

    // ============ Internal Helpers ============

    /// @notice Convert address to lowercase hex string (no 0x prefix)
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes20 b = bytes20(addr);
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            s[2 * i] = alphabet[uint8(b[i] >> 4)];
            s[2 * i + 1] = alphabet[uint8(b[i] & 0x0f)];
        }
        return string(s);
    }

    /// @notice Convert uint to decimal string
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            // casting to 'uint8' is safe because value % 10 is always 0-9, so 48 + (0-9) = 48-57 fits in uint8
            // forge-lint: disable-next-line(unsafe-typecast)
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /// @notice Extract revert reason from error bytes
    function _getRevertReason(bytes memory reason) internal pure returns (string memory) {
        if (reason.length < 68) return "Unknown error";
        // Skip 4-byte selector + 32-byte offset + 32-byte length
        // Standard ABI encoding: offset(36) = 32 bytes for string offset, then 32 bytes for length
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 len;
        assembly {
            len := mload(add(reason, 68))
        }
        if (reason.length < 68 + len) return "Unknown error";
        bytes memory reasonBytes = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            reasonBytes[i] = reason[68 + i];
        }
        return string(reasonBytes);
    }
}
