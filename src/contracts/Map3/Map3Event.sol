// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IssueEvent
/// @notice A library containing all events emitted by the Issue contract.
library IssueEvent {
    // --- Issue Life Cycle Events ---
    event IssueCreated(
        uint256 indexed IssueId,
        address indexed creator,
        string metadata,
        string content
    );
    /// @dev Emitted when a Issue's content, metadata, or allowedComments status is changed.
    event IssueUpdated(
        uint256 indexed IssueId,
        address indexed updater,
        string newMetadata, // Added to provide the updated metadata
        string newContent // Added to provide the updated content
    );
    event IssueDeleted(
        uint256 indexed IssueId,
        address indexed deleter
    );
    
    // --- Interaction Events ---
    event IssueLiked(
        uint256 indexed IssueId,
        address indexed liker
    );
    event IssueUnliked(
        uint256 indexed IssueId,
        address indexed unliker
    );

    // --- Caching/Manager Events ---
    /// @dev Emitted by Issue.sol when the Comment Manager successfully updates the Issue's cached stats.
    event CommentStatsUpdated(
        uint256 indexed IssueId,
        uint256 newCommentCount // latestCommentId removed
    );

    // --- Contract Admin Events ---
    event Withdrawal(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
}
