// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IIdentityRegistry} from "./IERC8004.sol";
import {IReputationRegistry} from "./IERC8004.sol";
import {Errors} from "../libraries/Errors.sol";

contract SavannaAgentIdentity is Ownable {
    IIdentityRegistry public immutable IDENTITY_REGISTRY;
    IReputationRegistry public immutable REPUTATION_REGISTRY;

    uint256 public agentId;
    bool public registered;
    string public agentEndpoint;

    event AgentRegistered(uint256 indexed agentId, string agentURI);
    event AgentURISet(uint256 indexed agentId, string agentURI);
    event FeedbackSubmitted(uint256 indexed agentId, int128 value, string tag1);
    event StrategyFeedback(uint256 indexed agentId, uint256 apy, bool success);

    constructor(
        address identityRegistry_,
        address reputationRegistry_,
        address owner_
    ) Ownable(owner_) {
        if (identityRegistry_ == address(0) || reputationRegistry_ == address(0)) {
            revert Errors.Savanna__ZeroAddress();
        }
        IDENTITY_REGISTRY = IIdentityRegistry(identityRegistry_);
        REPUTATION_REGISTRY = IReputationRegistry(reputationRegistry_);
    }

    function registerAgent(string calldata agentURI) external onlyOwner returns (uint256) {
        if (registered) revert Errors.Savanna__ActiveRequestExists();
        agentId = IDENTITY_REGISTRY.register(agentURI);
        registered = true;
        emit AgentRegistered(agentId, agentURI);
        return agentId;
    }

    function setAgentURI(string calldata agentURI) external onlyOwner {
        if (!registered) revert Errors.Savanna__NoActiveRequest();
        IDENTITY_REGISTRY.setAgentURI(agentId, agentURI);
        emit AgentURISet(agentId, agentURI);
    }

    function setEndpoint(string calldata endpoint) external onlyOwner {
        agentEndpoint = endpoint;
    }

    function submitReputation(
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external onlyOwner {
        if (!registered) revert Errors.Savanna__NoActiveRequest();
        REPUTATION_REGISTRY.giveFeedback(
            agentId,
            value,
            valueDecimals,
            tag1,
            tag2,
            agentEndpoint,
            feedbackURI,
            feedbackHash
        );
        emit FeedbackSubmitted(agentId, value, tag1);
    }

    function submitStrategyFeedback(uint256 apy, bool success) external onlyOwner {
        if (!registered) revert Errors.Savanna__NoActiveRequest();
        // forge-lint: disable-next-line(unsafe-typecast)
        int128 value = success ? int128(int128(uint128(apy))) : -1;
        REPUTATION_REGISTRY.giveFeedback(
            agentId,
            value,
            success ? uint8(0) : uint8(0),
            "strategyResult",
            "savanna",
            agentEndpoint,
            "",
            bytes32(0)
        );
        emit StrategyFeedback(agentId, apy, success);
    }

    function isRegistered() external view returns (bool) {
        return registered;
    }

    function getAgentURI() external view returns (string memory) {
        if (!registered) return "";
        return IDENTITY_REGISTRY.agentURI(agentId);
    }
}
