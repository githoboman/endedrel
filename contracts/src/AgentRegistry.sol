// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Endedrel Agent Registry
 * ═══════════════════════════════════════════════════════════════════════════
 *  A decentralized marketplace for autonomous AI agents on GOAT Network
 *  (Bitcoin-secured, EVM-compatible L2). Implements reputation, recursive
 *  hiring, on-chain USDC escrow settlement, and dynamic pricing for
 *  agent-to-agent (A2A) commerce.
 *
 *  Ported from agent-registry.clar (Clarity / Stacks). Settlement is in USDC
 *  (6 decimals) via an ERC-20 token set at construction. Amounts that were
 *  denominated in micro-STX are now denominated in USDC base units.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentRegistry {
    // ── Reputation constants (2 decimal places, same basis as Clarity) ───────
    uint256 public constant REPUTATION_MAX = 10000;         // 100.00
    uint256 public constant REPUTATION_SUCCESS_BONUS = 50;  // +0.50 per success
    uint256 public constant REPUTATION_FAILURE_PENALTY = 100; // -1.00 per failure
    uint256 public constant REPUTATION_INITIAL = 5000;      // start at 50.00
    uint256 public constant REPUTABLE_THRESHOLD = 7000;     // 70.00

    // Escrow timeout. The Clarity version used 144 Stacks blocks (~24h at
    // ~10 min/block). GOAT block time differs, so this is expressed as an
    // owner-tunable block count rather than silently reusing 144.
    uint256 public escrowTimeoutBlocks;

    // ── Ownership & token ────────────────────────────────────────────────────
    address public immutable contractOwner;
    IERC20 public immutable settlementToken; // USDC on GOAT (6 decimals)

    // ── Errors (mirror Clarity err-codes) ────────────────────────────────────
    error OwnerOnly();              // u100
    error AgentExists();            // u101
    error AgentNotFound();          // u102
    error JobNotFound();            // u103
    error Unauthorized();           // u105
    error InvalidParams();          // u106
    error JobAlreadyComplete();     // u107
    error SelfHire();               // u108
    error EscrowNotFound();         // u120
    error DeadlineNotPassed();      // u121
    error JobAlreadySettled();      // u122
    error TransferFailed();

    // ── Structs (mirror Clarity maps) ────────────────────────────────────────
    struct Agent {
        string name;
        string endpoint;
        uint256 price;          // USDC base units (was price-stx)
        string category;
        uint256 reputation;     // 0-10000
        uint256 jobsCompleted;
        uint256 jobsFailed;
        uint256 totalEarned;
        bool isActive;
        uint256 registeredAt;   // block.number
        bool exists;
    }

    struct Job {
        address requester;
        address worker;
        uint256 amount;
        string category;
        bytes12 status;         // "pending" | "complete" | "failed" | "disputed"
        uint256 parentJobId;    // 0 if top-level
        uint256 createdAt;
        uint256 completedAt;
        bool exists;
    }

    struct EscrowRecord {
        uint256 amount;
        address requester;
        address worker;
        uint256 deadline;       // block.number after which requester can reclaim
        bool settled;
        bool exists;
    }

    // ── State ────────────────────────────────────────────────────────────────
    mapping(address => Agent) public agents;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => EscrowRecord) public escrows;
    mapping(bytes32 => address) public categoryLeader; // keccak(category) => agent

    uint256 public nextJobId = 1;
    uint256 public totalAgents;
    uint256 public totalJobs;
    uint256 public totalVolume; // total USDC settled

    // ── Events ───────────────────────────────────────────────────────────────
    event AgentRegistered(address indexed agent, string name, string category, uint256 price);
    event AgentUpdated(address indexed agent, string endpoint, uint256 price);
    event JobCreated(uint256 indexed jobId, address indexed requester, address indexed worker, uint256 amount, uint256 parentJobId);
    event JobCompleted(uint256 indexed jobId, address indexed worker, uint256 amount);
    event JobFailed(uint256 indexed jobId, address indexed worker);
    event JobDisputed(uint256 indexed jobId, address indexed requester);
    event EscrowRefunded(uint256 indexed jobId, address indexed requester, uint256 amount);

    bytes12 constant STATUS_PENDING = bytes12("pending");
    bytes12 constant STATUS_COMPLETE = bytes12("complete");
    bytes12 constant STATUS_FAILED = bytes12("failed");
    bytes12 constant STATUS_DISPUTED = bytes12("disputed");

    constructor(address _settlementToken, uint256 _escrowTimeoutBlocks) {
        contractOwner = msg.sender;
        settlementToken = IERC20(_settlementToken);
        escrowTimeoutBlocks = _escrowTimeoutBlocks;
    }

    // ── Agent lifecycle ──────────────────────────────────────────────────────

    /// Register a new agent on the marketplace.
    function registerAgent(
        string calldata name,
        string calldata endpoint,
        uint256 price,
        string calldata category
    ) external {
        if (agents[msg.sender].exists) revert AgentExists();
        if (price == 0) revert InvalidParams();

        agents[msg.sender] = Agent({
            name: name,
            endpoint: endpoint,
            price: price,
            category: category,
            reputation: REPUTATION_INITIAL,
            jobsCompleted: 0,
            jobsFailed: 0,
            totalEarned: 0,
            isActive: true,
            registeredAt: block.number,
            exists: true
        });
        totalAgents += 1;

        // First agent in a category becomes its leader.
        bytes32 catKey = keccak256(bytes(category));
        if (categoryLeader[catKey] == address(0)) {
            categoryLeader[catKey] = msg.sender;
        }

        emit AgentRegistered(msg.sender, name, category, price);
    }

    /// Update agent profile (endpoint, price).
    function updateAgent(string calldata endpoint, uint256 price) external {
        Agent storage a = agents[msg.sender];
        if (!a.exists) revert AgentNotFound();
        if (price == 0) revert InvalidParams();
        a.endpoint = endpoint;
        a.price = price;
        emit AgentUpdated(msg.sender, endpoint, price);
    }

    /// Toggle agent active status.
    function setActive(bool active) external {
        Agent storage a = agents[msg.sender];
        if (!a.exists) revert AgentNotFound();
        a.isActive = active;
    }

    // ── Job lifecycle ────────────────────────────────────────────────────────

    /// Create a job (hire an agent). USDC is pulled into escrow held by this
    /// contract. Requester must have approved this contract for `amount` first.
    function createJob(
        address worker,
        string calldata category,
        uint256 parentJobId
    ) external returns (uint256) {
        Agent storage workerProfile = agents[worker];
        if (!workerProfile.exists) revert AgentNotFound();
        if (msg.sender == worker) revert SelfHire();

        uint256 amount = workerProfile.price;
        uint256 jobId = nextJobId;

        // Pull payment from requester into escrow (contract holds it).
        if (!settlementToken.transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }

        escrows[jobId] = EscrowRecord({
            amount: amount,
            requester: msg.sender,
            worker: worker,
            deadline: block.number + escrowTimeoutBlocks,
            settled: false,
            exists: true
        });

        jobs[jobId] = Job({
            requester: msg.sender,
            worker: worker,
            amount: amount,
            category: category,
            status: STATUS_PENDING,
            parentJobId: parentJobId,
            createdAt: block.number,
            completedAt: 0,
            exists: true
        });

        nextJobId = jobId + 1;
        totalJobs += 1;
        totalVolume += amount;

        emit JobCreated(jobId, msg.sender, worker, amount, parentJobId);
        return jobId;
    }

    /// Mark a job complete (called by the worker) — releases escrow to worker.
    function completeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (!job.exists) revert JobNotFound();
        EscrowRecord storage escrow = escrows[jobId];
        if (!escrow.exists) revert EscrowNotFound();
        Agent storage workerProfile = agents[job.worker];
        if (!workerProfile.exists) revert AgentNotFound();

        if (msg.sender != job.worker) revert Unauthorized();
        if (job.status != STATUS_PENDING) revert JobAlreadyComplete();
        if (escrow.settled) revert JobAlreadySettled();

        escrow.settled = true;
        job.status = STATUS_COMPLETE;
        job.completedAt = block.number;

        // Release escrow to worker.
        if (!settlementToken.transfer(job.worker, escrow.amount)) {
            revert TransferFailed();
        }

        // Boost reputation (capped at max).
        uint256 newRep = _min(REPUTATION_MAX, workerProfile.reputation + REPUTATION_SUCCESS_BONUS);
        workerProfile.reputation = newRep;
        workerProfile.jobsCompleted += 1;
        workerProfile.totalEarned += job.amount;

        _updateCategoryLeader(job.category, job.worker);

        emit JobCompleted(jobId, job.worker, escrow.amount);
    }

    /// Mark a job failed — refunds escrow to requester, penalizes worker.
    function failJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (!job.exists) revert JobNotFound();
        EscrowRecord storage escrow = escrows[jobId];
        if (!escrow.exists) revert EscrowNotFound();
        Agent storage workerProfile = agents[job.worker];
        if (!workerProfile.exists) revert AgentNotFound();

        if (msg.sender != job.requester && msg.sender != contractOwner) revert Unauthorized();
        if (job.status != STATUS_PENDING) revert JobAlreadyComplete();
        if (escrow.settled) revert JobAlreadySettled();

        escrow.settled = true;
        job.status = STATUS_FAILED;
        job.completedAt = block.number;

        // Refund to requester.
        if (!settlementToken.transfer(escrow.requester, escrow.amount)) {
            revert TransferFailed();
        }

        // Penalize reputation (floor at 0).
        uint256 rep = workerProfile.reputation;
        workerProfile.reputation = rep >= REPUTATION_FAILURE_PENALTY ? rep - REPUTATION_FAILURE_PENALTY : 0;
        workerProfile.jobsFailed += 1;

        emit JobFailed(jobId, job.worker);
    }

    /// Refund escrow after deadline — permissionless timeout.
    function refundEscrow(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (!job.exists) revert JobNotFound();
        EscrowRecord storage escrow = escrows[jobId];
        if (!escrow.exists) revert EscrowNotFound();

        if (escrow.settled) revert JobAlreadySettled();
        if (job.status != STATUS_PENDING) revert JobAlreadyComplete();
        if (block.number < escrow.deadline) revert DeadlineNotPassed();

        escrow.settled = true;
        job.status = STATUS_FAILED;
        job.completedAt = block.number;

        if (!settlementToken.transfer(escrow.requester, escrow.amount)) {
            revert TransferFailed();
        }

        emit EscrowRefunded(jobId, escrow.requester, escrow.amount);
    }

    /// Dispute a job — parks funds until admin resolution.
    function disputeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (!job.exists) revert JobNotFound();
        EscrowRecord storage escrow = escrows[jobId];
        if (!escrow.exists) revert EscrowNotFound();

        if (msg.sender != job.requester) revert Unauthorized();
        if (job.status != STATUS_PENDING) revert JobAlreadyComplete();
        if (escrow.settled) revert JobAlreadySettled();

        job.status = STATUS_DISPUTED;
        job.completedAt = 0;

        emit JobDisputed(jobId, job.requester);
    }

    // ── Governance ───────────────────────────────────────────────────────────

    /// Direct reputation update (owner only).
    function govSetReputation(address agent, uint256 newScore) external {
        if (msg.sender != contractOwner) revert OwnerOnly();
        Agent storage a = agents[agent];
        if (!a.exists) revert AgentNotFound();
        if (newScore > REPUTATION_MAX) revert InvalidParams();
        a.reputation = newScore;
    }

    /// Adjust escrow timeout (owner only).
    function govSetEscrowTimeout(uint256 blocksCount) external {
        if (msg.sender != contractOwner) revert OwnerOnly();
        escrowTimeoutBlocks = blocksCount;
    }

    // ── Read-only (discovery + analytics) ────────────────────────────────────

    function getAgent(address agent) external view returns (Agent memory) {
        return agents[agent];
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getEscrow(uint256 jobId) external view returns (EscrowRecord memory) {
        return escrows[jobId];
    }

    /// Dynamic price: base + reputation premium (+1% per 100 rep above 5000).
    function getDynamicPrice(address agent) external view returns (uint256) {
        Agent storage a = agents[agent];
        if (!a.exists) revert AgentNotFound();
        uint256 premium = a.reputation > 5000
            ? (a.price * (a.reputation - 5000)) / 100000
            : 0;
        return a.price + premium;
    }

    function getCategoryLeader(string calldata category) external view returns (address) {
        return categoryLeader[keccak256(bytes(category))];
    }

    function getStats() external view returns (
        uint256 _totalAgents,
        uint256 _totalJobs,
        uint256 _totalVolume,
        uint256 _nextJobId
    ) {
        return (totalAgents, totalJobs, totalVolume, nextJobId);
    }

    /// Reputable if reputation >= 70.00.
    function isReputable(address agent) external view returns (bool) {
        Agent storage a = agents[agent];
        return a.exists && a.reputation >= REPUTABLE_THRESHOLD;
    }

    /// Efficiency score = (reputation * 1000) / price.
    function getEfficiencyScore(address agent) external view returns (uint256) {
        Agent storage a = agents[agent];
        if (!a.exists) revert AgentNotFound();
        return a.price > 0 ? (a.reputation * 1000) / a.price : 0;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a <= b ? a : b;
    }

    function _updateCategoryLeader(string memory category, address candidate) private {
        bytes32 catKey = keccak256(bytes(category));
        address current = categoryLeader[catKey];
        if (current == address(0)) {
            categoryLeader[catKey] = candidate;
            return;
        }
        if (agents[candidate].reputation > agents[current].reputation) {
            categoryLeader[catKey] = candidate;
        }
    }
}
