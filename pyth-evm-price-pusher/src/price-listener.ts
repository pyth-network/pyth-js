import { HexString, Price, UnixTimestamp } from "@pythnetwork/pyth-evm-js";

export type PriceInfo = {
  price: Price;
  publishTime: UnixTimestamp;
};

export interface PriceListener {
  getLatestPriceInfo(priceId: HexString): undefined | PriceInfo;
}
