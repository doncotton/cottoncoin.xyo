import { ethers } from "hardhat";

import type { CottonCoin } from "../../types/CottonCoin";
import type { CottonCoin__factory } from "../../types/factories/CottonCoin__factory";

export const InteractionType = {
  DELIVERY_WAYPOINT: 0,
  RETAIL_VISIT: 1,
  PICKUP_CONFIRMATION: 2,
  DROPOFF_CONFIRMATION: 3,
  CUSTOM: 4,
} as const;

// A realistic waypoint: XYO HQ, San Diego (lat 32.715736, lon -117.161087)
export const SAMPLE_LAT = 32_715_736n;
export const SAMPLE_LON = -117_161_087n;
export const SAMPLE_TIMESTAMP = BigInt(Math.floor(Date.now() / 1000));
export const SAMPLE_PROOF_HASH = ethers.keccak256(ethers.toUtf8Bytes("xyo-proof-of-context-v1"));
export const SAMPLE_METADATA = JSON.stringify({ route: "pilot-001", stop: 3, driver: "fleet-device-A" });

export function makeWaypointId(deviceId: string, timestamp: bigint, lat: bigint, lon: bigint): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "uint64", "int64", "int64"], [deviceId, timestamp, lat, lon]),
  );
}

export async function deployCottonCoinFixture() {
  const [owner, logger, otherAccount] = await ethers.getSigners();

  const CottonCoinFactory = (await ethers.getContractFactory("CottonCoin")) as CottonCoin__factory;
  const cottonCoin = (await CottonCoinFactory.deploy()) as CottonCoin;
  const cottonCoin_address = await cottonCoin.getAddress();

  const deviceId = ethers.keccak256(ethers.toUtf8Bytes("fleet-device-A"));
  const waypointId = makeWaypointId(deviceId, SAMPLE_TIMESTAMP, SAMPLE_LAT, SAMPLE_LON);

  return {
    cottonCoin,
    cottonCoin_address,
    owner,
    logger,
    otherAccount,
    deviceId,
    waypointId,
  };
}
