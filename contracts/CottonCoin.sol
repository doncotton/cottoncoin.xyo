// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.9;

// --- Custom errors -----------------------------------------------------------

error NotOwner(address caller);
error WaypointAlreadyLogged(bytes32 waypointId);
error EmptyWaypointId();
error EmptyDeviceId();

// --- Contract ----------------------------------------------------------------

/**
 * @title CottonCoin
 * @notice Event-driven pass-through for XYO Proof of Context verifications.
 *
 * Each call to `logInteraction` records a physical waypoint or retail visit
 * on-chain and emits an `InteractionLogged` event. Off-chain listeners
 * (webhooks, Zapier, The Graph) subscribe to that event to trigger downstream
 * automations without storing bulk data in contract storage.
 *
 * Interaction types recognised by off-chain consumers:
 *   0 = DELIVERY_WAYPOINT   – fleet vehicle passed a known location
 *   1 = RETAIL_VISIT        – device entered a retail geofence
 *   2 = PICKUP_CONFIRMATION – item collected at origin
 *   3 = DROPOFF_CONFIRMATION– item delivered at destination
 *   4 = CUSTOM              – caller-defined interaction
 */
contract CottonCoin {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum InteractionType {
        DELIVERY_WAYPOINT,
        RETAIL_VISIT,
        PICKUP_CONFIRMATION,
        DROPOFF_CONFIRMATION,
        CUSTOM
    }

    struct Interaction {
        bytes32 waypointId; // Unique ID for this waypoint/visit (caller-assigned)
        bytes32 deviceId; // XYO device or sentinel identifier
        InteractionType interactionType;
        int64 lat; // Latitude  × 1e6 (e.g. 37422000 = 37.422000°)
        int64 lon; // Longitude × 1e6 (e.g. -122084000 = -122.084000°)
        uint64 timestamp; // Unix timestamp supplied by the caller
        bytes32 proofHash; // Hash of the XYO Proof of Context payload
        string metadata; // Optional free-form JSON for Zapier / webhook body
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public owner;

    // waypointId => block number it was first logged (0 = never logged)
    mapping(bytes32 waypointId => uint256 blockNumber) public loggedAt;

    // Total interactions logged, useful as a cheap off-chain cursor
    uint256 public interactionCount;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted for every verified physical interaction.
     *
     * Off-chain consumers index on `deviceId` or `interactionType` to fan out
     * to the correct webhook / Zapier zap.
     *
     * @param waypointId      Caller-assigned unique ID for deduplication.
     * @param deviceId        XYO device or sentinel that produced the proof.
     * @param interactionType Enumerated interaction category.
     * @param lat             Latitude  × 1e6.
     * @param lon             Longitude × 1e6.
     * @param timestamp       Unix timestamp of the physical event.
     * @param proofHash       Keccak256 of the XYO Proof of Context payload.
     * @param logger          Address that submitted the transaction.
     * @param metadata        Optional JSON string for downstream automation.
     */
    event InteractionLogged(
        bytes32 indexed waypointId,
        bytes32 indexed deviceId,
        InteractionType indexed interactionType,
        int64 lat,
        int64 lon,
        uint64 timestamp,
        bytes32 proofHash,
        address logger,
        string metadata
    );

    /**
     * @notice Emitted when contract ownership is transferred.
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    // -------------------------------------------------------------------------
    // Core logic
    // -------------------------------------------------------------------------

    /**
     * @notice Log a physical interaction verified by an XYO Proof of Context.
     *
     * The function is intentionally permissionless so any authorised fleet
     * device or backend relay can submit without a centralised key. Duplicate
     * `waypointId` values are rejected to prevent replay.
     *
     * @param waypointId      Unique ID for this event (e.g. keccak256 of
     *                        deviceId + timestamp + location).
     * @param deviceId        XYO device or sentinel identifier.
     * @param interactionType Category of physical interaction.
     * @param lat             Latitude  × 1e6 (signed to support S hemisphere).
     * @param lon             Longitude × 1e6 (signed to support W hemisphere).
     * @param timestamp       Unix timestamp of the physical event.
     * @param proofHash       Keccak256 of the raw XYO Proof of Context bytes.
     * @param metadata        Optional JSON string forwarded in the event for
     *                        Zapier / webhook consumers.
     */
    function logInteraction(
        bytes32 waypointId,
        bytes32 deviceId,
        InteractionType interactionType,
        int64 lat,
        int64 lon,
        uint64 timestamp,
        bytes32 proofHash,
        string calldata metadata
    ) external {
        if (waypointId == bytes32(0)) revert EmptyWaypointId();
        if (deviceId == bytes32(0)) revert EmptyDeviceId();
        if (loggedAt[waypointId] != 0) revert WaypointAlreadyLogged(waypointId);

        loggedAt[waypointId] = block.number;
        unchecked {
            ++interactionCount;
        }

        emit InteractionLogged(
            waypointId,
            deviceId,
            interactionType,
            lat,
            lon,
            timestamp,
            proofHash,
            msg.sender,
            metadata
        );
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @notice Transfer contract ownership.
     * @param newOwner Address of the new owner. Cannot be the zero address.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NotOwner(address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
