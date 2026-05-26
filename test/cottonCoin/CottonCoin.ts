import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import type { Signers } from "../types";
import {
  InteractionType,
  SAMPLE_LAT,
  SAMPLE_LON,
  SAMPLE_METADATA,
  SAMPLE_PROOF_HASH,
  SAMPLE_TIMESTAMP,
  deployCottonCoinFixture,
  makeWaypointId,
} from "./CottonCoin.fixture";

describe("CottonCoin", function () {
  before(async function () {
    this.signers = {} as Signers;
    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.loadFixture = loadFixture;
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    beforeEach(async function () {
      const { cottonCoin, cottonCoin_address, owner } = await this.loadFixture(deployCottonCoinFixture);
      this.cottonCoin = cottonCoin;
      this.cottonCoin_address = cottonCoin_address;
      this.owner = owner;
    });

    it("Should set the deployer as owner", async function () {
      expect(await this.cottonCoin.owner()).to.equal(this.owner.address);
    });

    it("Should start with zero interactions logged", async function () {
      expect(await this.cottonCoin.interactionCount()).to.equal(0);
    });
  });

  // ---------------------------------------------------------------------------
  // logInteraction — happy path
  // ---------------------------------------------------------------------------

  describe("logInteraction", function () {
    beforeEach(async function () {
      const { cottonCoin, owner, logger, otherAccount, deviceId, waypointId } =
        await this.loadFixture(deployCottonCoinFixture);
      this.cottonCoin = cottonCoin;
      this.owner = owner;
      this.logger = logger;
      this.otherAccount = otherAccount;
      this.deviceId = deviceId;
      this.waypointId = waypointId;
    });

    it("Should emit InteractionLogged with correct indexed fields", async function () {
      await expect(
        this.cottonCoin
          .connect(this.logger)
          .logInteraction(
            this.waypointId,
            this.deviceId,
            InteractionType.DELIVERY_WAYPOINT,
            SAMPLE_LAT,
            SAMPLE_LON,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            SAMPLE_METADATA,
          ),
      )
        .to.emit(this.cottonCoin, "InteractionLogged")
        .withArgs(
          this.waypointId,
          this.deviceId,
          InteractionType.DELIVERY_WAYPOINT,
          SAMPLE_LAT,
          SAMPLE_LON,
          SAMPLE_TIMESTAMP,
          SAMPLE_PROOF_HASH,
          this.logger.address,
          SAMPLE_METADATA,
        );
    });

    it("Should increment interactionCount after each log", async function () {
      const deviceId2 = ethers.keccak256(ethers.toUtf8Bytes("fleet-device-B"));
      const ts2 = SAMPLE_TIMESTAMP + 1n;
      const waypointId2 = makeWaypointId(deviceId2, ts2, SAMPLE_LAT, SAMPLE_LON);

      await this.cottonCoin
        .connect(this.logger)
        .logInteraction(
          this.waypointId,
          this.deviceId,
          InteractionType.DELIVERY_WAYPOINT,
          SAMPLE_LAT,
          SAMPLE_LON,
          SAMPLE_TIMESTAMP,
          SAMPLE_PROOF_HASH,
          SAMPLE_METADATA,
        );

      await this.cottonCoin
        .connect(this.logger)
        .logInteraction(
          waypointId2,
          deviceId2,
          InteractionType.RETAIL_VISIT,
          SAMPLE_LAT,
          SAMPLE_LON,
          ts2,
          SAMPLE_PROOF_HASH,
          "",
        );

      expect(await this.cottonCoin.interactionCount()).to.equal(2);
    });

    it("Should record the block number in loggedAt", async function () {
      const tx = await this.cottonCoin
        .connect(this.logger)
        .logInteraction(
          this.waypointId,
          this.deviceId,
          InteractionType.PICKUP_CONFIRMATION,
          SAMPLE_LAT,
          SAMPLE_LON,
          SAMPLE_TIMESTAMP,
          SAMPLE_PROOF_HASH,
          "",
        );
      const receipt = await tx.wait();
      expect(await this.cottonCoin.loggedAt(this.waypointId)).to.equal(receipt?.blockNumber);
    });

    it("Should accept all five InteractionType values", async function () {
      const types = [
        InteractionType.DELIVERY_WAYPOINT,
        InteractionType.RETAIL_VISIT,
        InteractionType.PICKUP_CONFIRMATION,
        InteractionType.DROPOFF_CONFIRMATION,
        InteractionType.CUSTOM,
      ];

      for (const [i, interactionType] of types.entries()) {
        const deviceId = ethers.keccak256(ethers.toUtf8Bytes(`device-${i}`));
        const ts = SAMPLE_TIMESTAMP + BigInt(i);
        const waypointId = makeWaypointId(deviceId, ts, SAMPLE_LAT, SAMPLE_LON);

        await expect(
          this.cottonCoin
            .connect(this.logger)
            .logInteraction(waypointId, deviceId, interactionType, SAMPLE_LAT, SAMPLE_LON, ts, SAMPLE_PROOF_HASH, ""),
        ).to.emit(this.cottonCoin, "InteractionLogged");
      }
    });

    it("Should accept negative coordinates (southern/western hemisphere)", async function () {
      const lat = -33_868_820n; // Sydney, AU
      const lon = 151_209_290n;
      const deviceId = ethers.keccak256(ethers.toUtf8Bytes("device-au"));
      const waypointId = makeWaypointId(deviceId, SAMPLE_TIMESTAMP, lat, lon);

      await expect(
        this.cottonCoin
          .connect(this.logger)
          .logInteraction(
            waypointId,
            deviceId,
            InteractionType.CUSTOM,
            lat,
            lon,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            "",
          ),
      ).to.emit(this.cottonCoin, "InteractionLogged");
    });

    it("Should allow any address to log (permissionless)", async function () {
      await expect(
        this.cottonCoin
          .connect(this.otherAccount)
          .logInteraction(
            this.waypointId,
            this.deviceId,
            InteractionType.DELIVERY_WAYPOINT,
            SAMPLE_LAT,
            SAMPLE_LON,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            "",
          ),
      ).to.emit(this.cottonCoin, "InteractionLogged");
    });
  });

  // ---------------------------------------------------------------------------
  // logInteraction — reverts
  // ---------------------------------------------------------------------------

  describe("logInteraction reverts", function () {
    beforeEach(async function () {
      const { cottonCoin, logger, deviceId, waypointId } = await this.loadFixture(deployCottonCoinFixture);
      this.cottonCoin = cottonCoin;
      this.logger = logger;
      this.deviceId = deviceId;
      this.waypointId = waypointId;
    });

    it("Should revert with EmptyWaypointId when waypointId is zero", async function () {
      await expect(
        this.cottonCoin
          .connect(this.logger)
          .logInteraction(
            ethers.ZeroHash,
            this.deviceId,
            InteractionType.DELIVERY_WAYPOINT,
            SAMPLE_LAT,
            SAMPLE_LON,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            "",
          ),
      ).to.be.revertedWithCustomError(this.cottonCoin, "EmptyWaypointId");
    });

    it("Should revert with EmptyDeviceId when deviceId is zero", async function () {
      await expect(
        this.cottonCoin
          .connect(this.logger)
          .logInteraction(
            this.waypointId,
            ethers.ZeroHash,
            InteractionType.DELIVERY_WAYPOINT,
            SAMPLE_LAT,
            SAMPLE_LON,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            "",
          ),
      ).to.be.revertedWithCustomError(this.cottonCoin, "EmptyDeviceId");
    });

    it("Should revert with WaypointAlreadyLogged on duplicate waypointId", async function () {
      await this.cottonCoin
        .connect(this.logger)
        .logInteraction(
          this.waypointId,
          this.deviceId,
          InteractionType.DELIVERY_WAYPOINT,
          SAMPLE_LAT,
          SAMPLE_LON,
          SAMPLE_TIMESTAMP,
          SAMPLE_PROOF_HASH,
          "",
        );

      await expect(
        this.cottonCoin
          .connect(this.logger)
          .logInteraction(
            this.waypointId,
            this.deviceId,
            InteractionType.DELIVERY_WAYPOINT,
            SAMPLE_LAT,
            SAMPLE_LON,
            SAMPLE_TIMESTAMP,
            SAMPLE_PROOF_HASH,
            "",
          ),
      )
        .to.be.revertedWithCustomError(this.cottonCoin, "WaypointAlreadyLogged")
        .withArgs(this.waypointId);
    });
  });

  // ---------------------------------------------------------------------------
  // transferOwnership
  // ---------------------------------------------------------------------------

  describe("transferOwnership", function () {
    beforeEach(async function () {
      const { cottonCoin, owner, otherAccount } = await this.loadFixture(deployCottonCoinFixture);
      this.cottonCoin = cottonCoin;
      this.owner = owner;
      this.otherAccount = otherAccount;
    });

    it("Should transfer ownership and emit OwnershipTransferred", async function () {
      await expect(this.cottonCoin.connect(this.owner).transferOwnership(this.otherAccount.address))
        .to.emit(this.cottonCoin, "OwnershipTransferred")
        .withArgs(this.owner.address, this.otherAccount.address);

      expect(await this.cottonCoin.owner()).to.equal(this.otherAccount.address);
    });

    it("Should revert when called by a non-owner", async function () {
      await expect(this.cottonCoin.connect(this.otherAccount).transferOwnership(this.otherAccount.address))
        .to.be.revertedWithCustomError(this.cottonCoin, "NotOwner")
        .withArgs(this.otherAccount.address);
    });

    it("Should revert when transferring to the zero address", async function () {
      await expect(this.cottonCoin.connect(this.owner).transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(this.cottonCoin, "NotOwner")
        .withArgs(ethers.ZeroAddress);
    });
  });
});
