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
  bnb_testnet: "0xd7308b14BF4008e7C7196eC35610B1427C5702EA",
  fuji: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  fantom_testnet: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  ropsten: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  goerli: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  mumbai: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  aurora_testnet: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
};
