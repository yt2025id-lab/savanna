// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIdentityRegistry {
    function register() external returns (uint256);
    function register(string calldata agentURI) external returns (uint256);
    function register(
        string calldata agentURI,
        bytes32[] calldata metadataKeys,
        bytes[] calldata metadataValues
    ) external returns (uint256);
    function ownerOf(uint256 agentId) external view returns (address);
    function agentURI(uint256 agentId) external view returns (string memory);
    function setAgentURI(uint256 agentId, string calldata agentURI) external;
    function getMetadata(uint256 agentId, bytes32 key) external view returns (bytes memory);
}

interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    function getFeedbackCount(uint256 agentId) external view returns (uint256);
}
