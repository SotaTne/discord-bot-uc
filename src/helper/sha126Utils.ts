import crypto from "crypto";
import { startOclocks } from "./utils.js";

const ALGORITHM = "sha256";

export function toEncored128(n: number) {
  const hash = crypto.createHash(ALGORITHM);
  hash.update(n.toString());
  return hash.digest("hex").split("").slice(0, 32).join("");
}

export const isInStartOclocks = (encoded: string): boolean => {
  let flag = false;
  startOclocks.forEach((time) => {
    if (toEncored128(time) === encoded) {
      flag = true;
    }
  });
  return flag;
};

export const getAllCreatedEncored128 = () => {
  const encoreds: Set<string> = new Set();
  startOclocks.forEach((time) => {
    encoreds.add(toEncored128(time));
  });
  return encoreds;
};

export const getTimeTuples: () => [number, string][] = () => {
  const tuples: [number, string][] = [];
  startOclocks.forEach((time) => {
    tuples.push([time, toEncored128(time)]);
  });
  return tuples;
};
