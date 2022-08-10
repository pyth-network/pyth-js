import { HexString, PriceStatus } from "@pythnetwork/pyth-evm-js";

export type PctNumber = number;
export type DurationInSeconds = number;

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function removeLeading0x(id: HexString): HexString {
  if (id.startsWith("0x")) {
    return id.substring(2);
  }
  return id;
}

export function addLeading0x(id: HexString): HexString {
  if (id.startsWith("0x")) {
    return id;
  }
  return "0x" + id;
}

export function statusNumberToEnum(status: number): PriceStatus {
  switch (status) {
    case 0:
      return PriceStatus.Unknown;
    case 1:
      return PriceStatus.Trading;
    case 2:
      return PriceStatus.Halted;
    case 3:
      return PriceStatus.Auction;
    default:
      throw new Error("Invalid status");
  }
}

export function isWsEndpoint(endpoint: string): boolean {
  const url = new URL(endpoint);
  const protocol = url.protocol;

  if (protocol === "ws:" || protocol == "wss:") {
    return true;
  }

  return false;
}
