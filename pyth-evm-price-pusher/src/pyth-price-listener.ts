import {
  EvmPriceServiceConnection,
  HexString,
  PriceFeed,
  PriceStatus,
} from "@pythnetwork/pyth-evm-js";
import { PriceInfo, PriceListener } from "./price-listener";

export class PythPriceListener implements PriceListener {
  private connection: EvmPriceServiceConnection;
  private priceIds: HexString[];
  private latestPriceInfo: Map<HexString, PriceInfo>;

  constructor(connection: EvmPriceServiceConnection, priceIds: HexString[]) {
    this.connection = connection;
    this.priceIds = priceIds;
    this.latestPriceInfo = new Map();
  }

  // This method should be awaited on and once it finishes it has the latest value
  // for the given price feeds (if they exist).
  async start() {
    this.connection.subscribePriceFeedUpdates(
      this.priceIds,
      this.onNewPriceFeed.bind(this)
    );

    const priceFeeds = await this.connection.getLatestPriceFeeds(this.priceIds);
    priceFeeds?.forEach((priceFeed) => {
      const prevPrice = priceFeed.getPrevPriceUnchecked();
      this.latestPriceInfo.set(priceFeed.id, {
        price: prevPrice[0].price,
        conf: prevPrice[0].conf,
        publishTime: prevPrice[1],
      });
    });
  }

  private onNewPriceFeed(priceFeed: PriceFeed) {
    console.log(
      `Received new price feed update from Pyth price service with id ${priceFeed.id}`
    );

    const currentPrice = priceFeed.getCurrentPrice();
    if (currentPrice === undefined) {
      return;
    }

    const priceInfo: PriceInfo = {
      conf: currentPrice.conf,
      price: currentPrice.price,
      publishTime: priceFeed.publishTime,
    };

    this.latestPriceInfo.set(priceFeed.id, priceInfo);
  }

  getLatestPriceInfo(priceId: string): PriceInfo | undefined {
    return this.latestPriceInfo.get(priceId);
  }
}
