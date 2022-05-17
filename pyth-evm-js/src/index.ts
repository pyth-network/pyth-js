export { EvmPriceServiceConnection } from "./EvmPriceServiceConnection";

export {
  DurationInMs,
  HexString,
  Price,
  PriceFeed,
  PriceServiceConnectionConfig,
  PriceStatus,
  UnixTimestamp,
} from "@pythnetwork/pyth-common-js";

export const CONTRACT_ADDR: Record<string, string> = {
  bsc_testnet: "0x621284a611b64dEa837924092F3B6C12C03C386E",
};
