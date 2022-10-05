export { EvmPriceServiceConnection } from "./EvmPriceServiceConnection";

export {
  DurationInMs,
  HexString,
  Price,
  PriceFeed,
  PriceServiceConnectionConfig,
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
  bnb: "0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594",
  avalanche: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
  fantom: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  polygon: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  ethereum: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
  optimism: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
  aurora: "0xF89C7b475821EC3fDC2dC8099032c05c6c0c9AB9",
  arbitrum: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
};
