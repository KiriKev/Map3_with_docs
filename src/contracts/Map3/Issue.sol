// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./../Counters.sol";
import "./IssueEvent.sol";
import "./IssueError.sol";

/// @title Issue
/// @author Aratta Labs
/// @notice
/// @custom:version 1
/// @custom:emoji 🚨
/// @custom:security-contact atenyun@gmail.com
contract Issue is Ownable(msg.sender), Pausable, ReentrancyGuard {
    // State Variables
    using Counters for Counters.Counter;

    Counters.Counter public issueCount;
    uint256 public fee = 0 ether;

    /// @dev The address of the deployed PostCommentManager contract.
    address public commentManagerAddress;

    /// @dev A mapping to store post data using a uint256 ID
    mapping(uint256 => IssueData) public issues;

    /// @dev A mapping for generic key-value storage linked to a specific post ID.
    mapping(uint256 => mapping(bytes32 => string)) public blockStorage;

    /// @dev NEW MAPPING: Stores a list of post IDs created by a specific user.
    mapping(address => uint256[]) public creatorIssues;

    // Structs
    /// @dev A struct to represent a single status post.
    struct IssueData {
        /// @dev The post's metadata, which can contain a URI or other off-chain data.
        string metadata;
        /// @dev The main text content of the post.
        string content;
        string lat;
        string long;
        string category;
        string address1;
        /// @dev The Unix timestamp when the post was created.
        uint256 createdAt;
        /// @dev The address of the account that created the post.
        address creator;
        /// @dev A flag indicating if the post has been soft-deleted.
        bool isDeleted;
        /// @dev A flag indicating if the post's content or metadata has ever been changed after creation.
        bool isUpdated;
        uint256 amount;
    }

    /// @dev A struct for returning post data without mappings.
    struct IssueWithoutMapping {
        uint256 issueId;
        string metadata;
        string content;
        string lat;
        string long;
        string category;
        string address1;
        uint256 createdAt;
        address creator;
        bool isDeleted;
        bool isUpdated;
        uint256 amount;
    }

    // Modifiers
    ///@dev Throws if called by any account other than the post creator.
    modifier onlyIssueCreator(uint256 _issueId) {
        require(issues[_issueId].creator == _msgSender(), "Only the issue creator can update an issue.");
        _;
    }

    // Constructor
    constructor() {
        issueCount.increment();
        uint256 issueId = issueCount.current();
        IssueData storage newIssue = issues[issueId];

        newIssue.metadata = "";
        newIssue.content = unicode"This is the first issue on Map3";
        newIssue.lat = "-40.150168234083736";
        newIssue.long = "-71.31541448757797";
        newIssue.category = "event";
        newIssue.createdAt = block.timestamp;
        newIssue.creator = _msgSender();
        newIssue.isDeleted = false;
        newIssue.isUpdated = false;

        // Index the first post by creator
        creatorIssues[_msgSender()].push(issueId);
    }

    // External & Public Functions

    // -------------------------------------

    // Post Management
    /// @notice Creates a new status post.
    function createIssue(string memory _metadata, string memory _content) external payable {
        require(msg.value >= fee, "Insufficient payment for post creation.");
        require(bytes(_content).length > 0, "Post content cannot be empty.");

        issueCount.increment();
        uint256 issueId = issueCount.current();
        IssueData storage newIssue = issues[issueId];

        newIssue.metadata = _metadata;
        newIssue.content = _content;
        newIssue.createdAt = block.timestamp;
        newIssue.creator = _msgSender();
        newIssue.isDeleted = false;
        newIssue.isUpdated = false;

        // NEW INDEXING: Add post ID to the creator's list
        creatorIssues[_msgSender()].push(issueId);

        emit IssueEvent.IssueCreated(issueId, _msgSender(), _metadata, _content);
    }

    /// @notice Updates an existing post's metadata and content.
    /// @dev Can only be called by the post creator.
    function updateIssue(uint256 _issueId, string memory _metadata, string memory _content) external onlyIssueCreator(_issueId) returns (bool) {
        IssueData storage updatedPost = issues[_issueId];
        require(!updatedPost.isDeleted, "Cannot update a deleted post.");
        require(bytes(_content).length > 0, "Post content cannot be empty.");

        updatedPost.metadata = _metadata;
        updatedPost.content = _content;
        updatedPost.isUpdated = true;

        emit IssueEvent.IssueUpdated(_issueId, _msgSender(), _metadata, _content);
        return true;
    }

    /// @notice Flags an existing post as deleted (soft delete).
    /// @dev Can only be called by the post creator.
    function deleteIssue(uint256 _issueId) external onlyIssueCreator(_issueId) {
        IssueData storage issue = issues[_issueId];
        require(!issue.isDeleted, "Post is already deleted.");
        issue.isDeleted = true;

        emit IssueEvent.IssueDeleted(_issueId, _msgSender());
    }

    // Owner Functions

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Transfers the entire contract's ETH balance to the contract owner.
    function withdrawAll() public onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Failed");
        emit IssueEvent.Withdrawal(owner(), amount, block.timestamp);
    }

    /// @notice Sets a key/value pair in the block storage for a specific post.
    function setKey(uint256 _issueId, bytes32 _key, string memory _val) public onlyOwner returns (bool) {
        require(!issues[_issueId].isDeleted, "Cannot set key for a deleted post.");
        blockStorage[_issueId][_key] = _val;
        return true;
    }

    /// @notice Deletes a key/value pair from the block storage for a specific post.
    function delKey(uint256 _issueId, bytes32 _key) public onlyOwner returns (bool) {
        require(!issues[_issueId].isDeleted, "Cannot delete key for a deleted post.");
        delete blockStorage[_issueId][_key];
        return true;
    }

    // View Functions

    /// @notice Retrieves a specific post by index.
    function getIssueByIndex(uint256 _index) public view returns (IssueWithoutMapping memory) {
        require(_index > 0, "Index must be greater than 0.");
        require(_index <= issueCount.current(), "Exceeds total post count.");

        IssueData storage issue = issues[_index];
        require(!issue.isDeleted, "Post not found or has been deleted."); // Explicitly block access to deleted post data

        return
            IssueWithoutMapping({
                issueId: _index,
                metadata: issue.metadata,
                content: issue.content,
                lat: issue.lat,
                long: issue.long,
                category: issue.category,
                address1: issue.address1,
                createdAt: issue.createdAt,
                creator: issue.creator,
                isDeleted: issue.isDeleted,
                isUpdated: issue.isUpdated,
                amount: issue.amount
            });
    }

    /// @notice Retrieves a paginated list of issues.
    /// @dev NOTE: This function does not filter out deleted issues to save gas. Filtering should be done client-side.
    function getIssues(uint256 _startIndex, uint256 _count) external view returns (IssueWithoutMapping[] memory) {
        require(_startIndex > 0, "Start index must be greater than 0.");
        // Check if the range ends within the bounds of existing post IDs
        require(_startIndex + _count <= issueCount.current() + 1, "Exceeds total post count.");

        IssueWithoutMapping[] memory issuesArray = new IssueWithoutMapping[](_count);

        for (uint256 i = 0; i < _count; i++) {
            uint256 issueId = _startIndex + i;
            IssueData storage issue = issues[issueId];
            issuesArray[i] = IssueWithoutMapping({
                issueId: issueId,
                metadata: issue.metadata,
                content: issue.content,
                lat: issue.lat,
                long: issue.long,
                category: issue.category,
                address1: issue.address1,
                createdAt: issue.createdAt,
                creator: issue.creator,
                isDeleted: issue.isDeleted,
                isUpdated: issue.isUpdated,
                amount: issue.amount
            });
        }
        return issuesArray;
    }

    /// @notice Gets the value of a key from the block storage for a specific post.
    function getKey(uint256 _issueId, bytes32 _key) public view returns (string memory) {
        require(!issues[_issueId].isDeleted, "Post not found or has been deleted.");
        return blockStorage[_issueId][_key];
    }
}
