# 🚨 Map3 Core Contract: `Issue.sol`

## Demo link
https://map3.aratta.dev/

## Walkthrough
https://youtu.be/PAp2pBmNT8k

## 🗺️ Project Overview: Map3 Decentralized Governance Ecosystem

The **Map3 Ecosystem** is a decentralized application built on Solidity to bring transparency and accountability to community issue tracking and governance. It provides a unified, on-chain workflow for handling real-world problems.

This contract, **`Issue.sol`**, serves as the immutable **data anchor** for the entire ecosystem. It allows community members to create, geo-tag, and verify reports of problems, which can then proceed to the subsequent Proposal and Event stages.

### The Map3 Workflow
1.  **Issue (This Contract):** Logs a specific problem with verifiable data (geo-coordinates, content).
2.  **Proposal:** (Handled by separate contract) Facilitates the debate, voting, and funding linked to a specific Issue ID.
3.  **Event:** (Handled by separate contract) Manages the scheduling, execution, and proof-of-completion for the approved Proposal.

***

## 🛠️ Contract Details: `Issue.sol`

The `Issue` contract manages the creation and lifecycle of a single community report. It is built using secure OpenZeppelin standards.

### Inheritance and Security

The contract inherits from the following OpenZeppelin contracts for robust security and access control:

* **`Ownable`**: For administrative control of key functions.
* **`Pausable`**: Allows the owner to halt operations in an emergency.
* **`ReentrancyGuard`**: Protects against reentrancy attacks (though currently unused on state-changing functions, it is a best practice inclusion).

### Core Data Structure (`IssueData`)

Every issue logged on the chain contains the following structured data:

| Field | Type | Description |
| :--- | :--- | :--- |
| **`issueId`** | `uint256` | The unique, sequential ID of the issue. |
| **`title` / `content`** | `string` | The main text and description of the report. |
| **`cordination`** | `string` | **Crucial geo-tag** for the issue (e.g., latitude, longitude). |
| **`category`** | `string` | Classification (e.g., "Infrastructure," "Safety," "Environment"). |
| **`creator`** | `address` | The wallet address that submitted the report. |
| **`createdAt`** | `uint256` | Unix timestamp of the creation. |
| **`amount`** | `uint256` | Suggested funding or cost (in Wei) for remediation. |
| **`isDeleted`** | `bool` | Flag for soft-deletion (data remains on-chain). |
| **`isUpdated`** | `bool` | Flag indicating if the issue has been modified since creation. |

***

## 🚀 Contract Functions

### Public Issue Management (User Facing)

| Function | Visibility | Description | Access Control |
| :--- | :--- | :--- | :--- |
| `createIssue(...)` | `external payable` | Logs a new issue on the chain. Requires a minimum `fee` to be paid. | Any User |
| `updateIssue(...)` | `external` | Allows the creator to modify the issue's metadata/content. | `onlyIssueCreator` |
| `deleteIssue(...)` | `external` | Sets the `isDeleted` flag to `true` (soft delete). | `onlyIssueCreator` |

### Owner / Admin Functions

| Function | Visibility | Description | Access Control |
| :--- | :--- | :--- | :--- |
| `pause()` / `unpause()` | `public` | Toggles the paused state of the contract. | `onlyOwner` |
| `withdrawAll()` | `public` | Transfers all accumulated ETH fees to the contract owner's address. | `onlyOwner` |
| `setKey(...)` / `delKey(...)` | `public` | Manages generic key-value storage (`blockStorage`) for official notes or metadata. | `onlyOwner` |

### View Functions (Data Retrieval)

| Function | Visibility | Description |
| :--- | :--- | :--- |
| `issueCount()` | `public view` | Returns the total number of issues created. |
| `getIssueByIndex(...)` | `public view` | Retrieves all details for a single issue ID. **Blocks access to deleted issues.** |
| `getIssues(...)` | `external view` | Retrieves a **paginated array** of issues. **NOTE:** This function does not filter deleted issues for gas efficiency; client-side filtering is required. |
| `getKey(...)` | `public view` | Retrieves the value of a specific key from the issue's generic `blockStorage`. |
