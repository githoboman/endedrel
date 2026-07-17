;; ═══════════════════════════════════════════════════════════════════════════
;; SYNERGI Agent Registry v2.1 (Nakamoto / Clarity 3 Compatible)
;; ═══════════════════════════════════════════════════════════════════════════
;; A decentralized marketplace for autonomous AI agents on Stacks.
;; Implements reputation, recursive hiring, on-chain settlement,
;; and dynamic pricing for machine-to-machine (A2A) commerce.
;; ═══════════════════════════════════════════════════════════════════════════

;; ── Constants ──────────────────────────────────────────────────────────────

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-agent-exists (err u101))
(define-constant err-agent-not-found (err u102))
(define-constant err-job-not-found (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-unauthorized (err u105))
(define-constant err-invalid-params (err u106))
(define-constant err-job-already-complete (err u107))
(define-constant err-self-hire (err u108))
(define-constant err-escrow-not-found (err u120))
(define-constant err-deadline-not-passed (err u121))
(define-constant err-job-already-settled (err u122))
(define-constant err-not-disputable (err u123))

;; Reputation thresholds
(define-constant REPUTATION-MAX u10000)          ;; 100.00 (2 decimal places)
(define-constant REPUTATION-SUCCESS-BONUS u50)   ;; +0.50 per success
(define-constant REPUTATION-FAILURE-PENALTY u100) ;; -1.00 per failure
(define-constant REPUTATION-INITIAL u5000)       ;; Start at 50.00
(define-constant ESCROW-TIMEOUT u144)            ;; ~24 hours on Stacks (~10 min/block)

;; ── Data Variables ─────────────────────────────────────────────────────────

(define-data-var next-job-id uint u1)
(define-data-var total-agents uint u0)
(define-data-var total-jobs uint u0)
(define-data-var total-volume uint u0)  ;; total micro-STX settled

;; ── Data Maps ──────────────────────────────────────────────────────────────

;; Agent profiles
(define-map Agents
    principal
    {
        name: (string-ascii 64),
        endpoint: (string-ascii 256),
        price-stx: uint,                ;; in micro-STX
        category: (string-ascii 32),    ;; "research", "coding", "weather", etc.
        reputation: uint,               ;; 0-10000 (2 decimal places)
        jobs-completed: uint,
        jobs-failed: uint,
        total-earned: uint,             ;; micro-STX earned lifetime
        is-active: bool,
        registered-at: uint             ;; block height
    }
)

;; Job records (for A2A hiring + settlement)
(define-map Jobs
    uint    ;; job-id
    {
        requester: principal,       ;; who hired
        worker: principal,          ;; who was hired
        amount: uint,               ;; micro-STX payment
        category: (string-ascii 32),
        status: (string-ascii 16),  ;; "pending", "complete", "failed", "disputed"
        parent-job-id: uint,        ;; 0 if top-level, else recursive parent
        created-at: uint,
        completed-at: uint
    }
)

;; Escrow records — funds held by contract until job settlement
(define-map Escrow
    uint    ;; job-id
    {
        amount: uint,               ;; micro-STX held
        requester: principal,
        worker: principal,
        deadline: uint,             ;; block-height after which requester can reclaim
        settled: bool               ;; true once released or refunded
    }
)

;; Leaderboard / index by category (stores top agent per category)
(define-map CategoryLeader
    (string-ascii 32)
    principal
)

;; ── Public Functions ───────────────────────────────────────────────────────

;; Register a new agent on the marketplace
(define-public (register-agent
    (name (string-ascii 64))
    (endpoint (string-ascii 256))
    (price-stx uint)
    (category (string-ascii 32)))
    (let
        ((caller tx-sender))
        (asserts! (is-none (map-get? Agents caller)) err-agent-exists)
        (asserts! (> price-stx u0) err-invalid-params)
        (map-set Agents caller {
            name: name,
            endpoint: endpoint,
            price-stx: price-stx,
            category: category,
            reputation: REPUTATION-INITIAL,
            jobs-completed: u0,
            jobs-failed: u0,
            total-earned: u0,
            is-active: true,
            registered-at: block-height
        })
        (var-set total-agents (+ (var-get total-agents) u1))

        ;; Set as category leader if first in category
        (match (map-get? CategoryLeader category)
            existing-leader (ok true)
            (begin
                (map-set CategoryLeader category caller)
                (ok true)
            )
        )
    )
)

;; Update agent profile (endpoint, price)
(define-public (update-agent
    (endpoint (string-ascii 256))
    (price-stx uint))
    (let
        ((caller tx-sender)
         (profile (unwrap! (map-get? Agents caller) err-agent-not-found)))
        (asserts! (> price-stx u0) err-invalid-params)
        (ok (map-set Agents caller (merge profile {
            endpoint: endpoint,
            price-stx: price-stx
        })))
    )
)

;; Toggle agent active status
(define-public (set-active (active bool))
    (let
        ((caller tx-sender)
         (profile (unwrap! (map-get? Agents caller) err-agent-not-found)))
        (ok (map-set Agents caller (merge profile {
            is-active: active
        })))
    )
)

;; ── Job Lifecycle ──────────────────────────────────────────────────────────

;; Create a job (hire an agent) — STX is held in escrow by the contract
(define-public (create-job
    (worker principal)
    (category (string-ascii 32))
    (parent-job-id uint))
    (let
        ((caller tx-sender)
         (worker-profile (unwrap! (map-get? Agents worker) err-agent-not-found))
         (amount (get price-stx worker-profile))
         (job-id (var-get next-job-id))
         ;; Nakamoto/C3: as-contract sets contract-caller, tx-sender is user.
         ;; contract-caller inside as-contract is the contract principal.
         (contract-addr (as-contract contract-caller)))
        ;; Cannot hire yourself
        (asserts! (not (is-eq caller worker)) err-self-hire)
        ;; Transfer payment from requester to CONTRACT (escrow)
        (try! (stx-transfer? amount caller contract-addr))
        ;; Record the escrow
        (map-set Escrow job-id {
            amount: amount,
            requester: caller,
            worker: worker,
            deadline: (+ block-height ESCROW-TIMEOUT),
            settled: false
        })
        ;; Record the job
        (map-set Jobs job-id {
            requester: caller,
            worker: worker,
            amount: amount,
            category: category,
            status: "pending",
            parent-job-id: parent-job-id,
            created-at: block-height,
            completed-at: u0
        })
        (var-set next-job-id (+ job-id u1))
        (var-set total-jobs (+ (var-get total-jobs) u1))
        (var-set total-volume (+ (var-get total-volume) amount))
        (ok job-id)
    )
)

;; Mark a job as complete (called by the worker) — releases escrow to worker
(define-public (complete-job (job-id uint))
    (let
        ((caller tx-sender)
         (job (unwrap! (map-get? Jobs job-id) err-job-not-found))
         (worker (get worker job))
         (worker-profile (unwrap! (map-get? Agents worker) err-agent-not-found))
         (escrow (unwrap! (map-get? Escrow job-id) err-escrow-not-found)))
        ;; Only the worker can mark complete
        (asserts! (is-eq caller worker) err-unauthorized)
        ;; Job must be pending
        (asserts! (is-eq (get status job) "pending") err-job-already-complete)
        ;; Escrow must not already be settled
        (asserts! (not (get settled escrow)) err-job-already-settled)
        ;; Release escrow: transfer from contract to worker
        ;; Nakamoto/C3: as-contract changes context so we can act as the contract
        (try! (as-contract (stx-transfer? (get amount escrow) contract-caller worker)))
        ;; Mark escrow as settled
        (map-set Escrow job-id (merge escrow { settled: true }))
        ;; Update job status
        (map-set Jobs job-id (merge job {
            status: "complete",
            completed-at: block-height
        }))
        ;; Boost worker reputation
        (let
            ((new-rep (min-uint REPUTATION-MAX
                (+ (get reputation worker-profile) REPUTATION-SUCCESS-BONUS))))
            (map-set Agents worker (merge worker-profile {
                reputation: new-rep,
                jobs-completed: (+ (get jobs-completed worker-profile) u1),
                total-earned: (+ (get total-earned worker-profile) (get amount job))
            }))
        )
        ;; Update category leader if this worker has higher reputation
        (update-category-leader (get category job) worker)
        (ok true)
    )
)

;; Mark a job as failed — refunds escrow to requester
(define-public (fail-job (job-id uint))
    (let
        ((caller tx-sender)
         (job (unwrap! (map-get? Jobs job-id) err-job-not-found))
         (worker (get worker job))
         (worker-profile (unwrap! (map-get? Agents worker) err-agent-not-found))
         (escrow (unwrap! (map-get? Escrow job-id) err-escrow-not-found)))
        ;; Only requester or contract-owner can fail a job
        (asserts! (or (is-eq caller (get requester job)) (is-eq caller contract-owner)) err-unauthorized)
        (asserts! (is-eq (get status job) "pending") err-job-already-complete)
        (asserts! (not (get settled escrow)) err-job-already-settled)
        ;; Refund escrow to requester
        (try! (as-contract (stx-transfer? (get amount escrow) contract-caller (get requester escrow))))
        ;; Mark escrow settled
        (map-set Escrow job-id (merge escrow { settled: true }))
        ;; Update job
        (map-set Jobs job-id (merge job {
            status: "failed",
            completed-at: block-height
        }))
        ;; Penalize worker reputation
        (let
            ((current-rep (get reputation worker-profile))
             (new-rep (if (>= current-rep REPUTATION-FAILURE-PENALTY)
                        (- current-rep REPUTATION-FAILURE-PENALTY)
                        u0)))
            (map-set Agents worker (merge worker-profile {
                reputation: new-rep,
                jobs-failed: (+ (get jobs-failed worker-profile) u1)
            }))
        )
        (ok true)
    )
)

;; Refund escrow after deadline — callable by anyone (permissionless timeout)
(define-public (refund-escrow (job-id uint))
    (let
        ((job (unwrap! (map-get? Jobs job-id) err-job-not-found))
         (escrow (unwrap! (map-get? Escrow job-id) err-escrow-not-found)))
        ;; Escrow must not already be settled
        (asserts! (not (get settled escrow)) err-job-already-settled)
        ;; Job must still be pending
        (asserts! (is-eq (get status job) "pending") err-job-already-complete)
        ;; Deadline must have passed
        (asserts! (>= block-height (get deadline escrow)) err-deadline-not-passed)
        ;; Refund to requester
        (try! (as-contract (stx-transfer? (get amount escrow) contract-caller (get requester escrow))))
        ;; Mark settled and job failed
        (map-set Escrow job-id (merge escrow { settled: true }))
        (map-set Jobs job-id (merge job {
            status: "failed",
            completed-at: block-height
        }))
        (ok true)
    )
)

;; Dispute a job — parks funds until admin resolution
(define-public (dispute-job (job-id uint))
    (let
        ((caller tx-sender)
         (job (unwrap! (map-get? Jobs job-id) err-job-not-found))
         (escrow (unwrap! (map-get? Escrow job-id) err-escrow-not-found)))
        ;; Only requester can dispute
        (asserts! (is-eq caller (get requester job)) err-unauthorized)
        ;; Must be pending and unsettled
        (asserts! (is-eq (get status job) "pending") err-job-already-complete)
        (asserts! (not (get settled escrow)) err-job-already-settled)
        ;; Mark as disputed — funds stay in contract until admin resolves
        (map-set Jobs job-id (merge job {
            status: "disputed",
            completed-at: u0
        }))
        (ok true)
    )
)

;; ── Reputation Management (Gov / Oracle) ───────────────────────────────────

;; Direct reputation update (governance only)
(define-public (gov-set-reputation (agent principal) (new-score uint))
    (let
        ((profile (unwrap! (map-get? Agents agent) err-agent-not-found)))
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (<= new-score REPUTATION-MAX) err-invalid-params)
        (ok (map-set Agents agent (merge profile {
            reputation: new-score
        })))
    )
)

;; ── Read-Only Functions (Discovery + Analytics) ────────────────────────────

;; Get agent details
(define-read-only (get-agent (agent principal))
    (map-get? Agents agent)
)

;; Get job details
(define-read-only (get-job (job-id uint))
    (map-get? Jobs job-id)
)

;; Get escrow details for a job
(define-read-only (get-escrow (job-id uint))
    (map-get? Escrow job-id)
)

;; Get dynamic price: base + reputation premium
(define-read-only (get-dynamic-price (agent principal))
    (let
        ((profile (unwrap! (map-get? Agents agent) (err u404)))
         (base-price (get price-stx profile))
         (rep (get reputation profile))
         ;; Premium: +1% per 100 reputation points above 5000
         (premium (if (> rep u5000)
            (/ (* base-price (- rep u5000)) u100000)
            u0)))
        (ok (+ base-price premium))
    )
)

;; Get the best agent in a category (by reputation leader)
(define-read-only (get-category-leader (category (string-ascii 32)))
    (map-get? CategoryLeader category)
)

;; Get marketplace stats
(define-read-only (get-stats)
    (ok {
        total-agents: (var-get total-agents),
        total-jobs: (var-get total-jobs),
        total-volume: (var-get total-volume),
        next-job-id: (var-get next-job-id)
    })
)

;; Check if an agent qualifies as "reputable" (reputation >= 70%)
(define-read-only (is-reputable (agent principal))
    (match (map-get? Agents agent)
        profile (>= (get reputation profile) u7000)
        false
    )
)

;; Get agent efficiency score (reputation / price ratio)
(define-read-only (get-efficiency-score (agent principal))
    (let
        ((profile (unwrap! (map-get? Agents agent) (err u404)))
         (rep (get reputation profile))
         (price (get price-stx profile)))
        ;; Score = (reputation * 1000) / price
        (ok (if (> price u0) (/ (* rep u1000) price) u0))
    )
)

;; ── Private Helpers ────────────────────────────────────────────────────────

(define-private (min-uint (a uint) (b uint))
    (if (<= a b) a b)
)

(define-private (update-category-leader (category (string-ascii 32)) (candidate principal))
    (match (map-get? CategoryLeader category)
        current-leader
            (match (map-get? Agents current-leader)
                leader-profile
                    (match (map-get? Agents candidate)
                        candidate-profile
                            (if (> (get reputation candidate-profile) (get reputation leader-profile))
                                (map-set CategoryLeader category candidate)
                                false
                            )
                        false
                    )
                (map-set CategoryLeader category candidate)
            )
        (map-set CategoryLeader category candidate)
    )
)
