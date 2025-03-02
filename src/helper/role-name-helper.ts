import { isInStartOclocks, toEncored128 } from "./sha126Utils.js";
import { decodeUnixTimestamp, getEncodedNow } from "./timestampCryptoUtils.js";
import { roleHeader } from "./utils.js";

export function sortNumber(a: string, b: string): number {
  return safeDecodeUnixTimestamp(a) - safeDecodeUnixTimestamp(b);
}

export function splitRole(roleName: string): {
  timeStamp: string;
  target128: string;
} {
  // ${roleHeader}${getEncodedNow()}-${toEncored128(time)}
  const [timeStamp, target128] = roleName.slice(roleHeader.length).split("-");
  return { timeStamp, target128 };
}

export function getTimeStampFromRoleName(roleName: string): number | null {
  const { timeStamp } = splitRole(roleName);
  const time = safeDecodeUnixTimestamp(timeStamp);
  if (time < 0) {
    return null;
  }
  return time;
}

export function safeDecodeUnixTimestamp(timeStamp: string): number {
  try {
    const decoded = decodeUnixTimestamp(timeStamp);
    if (decoded < 0) {
      console.error(`Failed to decode timestamp:`, timeStamp);
      return -1;
    }
    return decoded;
  } catch (error) {
    console.error(`Failed to decode timestamp:`, error);
    return -1;
  }
}

export function isCreatedRole(roleName: string): boolean {
  const { timeStamp, target128 } = splitRole(roleName);
  if (typeof timeStamp !== "string" || typeof target128 !== "string") {
    return false;
  }
  if (safeDecodeUnixTimestamp(timeStamp) < 0) {
    return false;
  }
  if (!isInStartOclocks(target128)) {
    return false;
  }
  return true;
}

export function isCreatedAndIsAtTimeRole(roleName: string, checkTime: number) {
  if (!isCreatedRole(roleName)) {
    return false;
  }
  const { target128 } = splitRole(roleName);
  return toEncored128(checkTime) === target128; // 指定した時間のロールかどうか
}

export function createRoleNow(time: number): string {
  return `${roleHeader}${getEncodedNow()}-${toEncored128(time)}`;
}
