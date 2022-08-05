import { HexString, PriceFeed } from "@pythnetwork/pyth-evm-js";
import { Contract } from "web3-eth-contract";
import { removeLeading0x, statusNumberToEnum } from "./utils";

export class Querier {
  private pythContract: Contract;

  constructor(pythContract: Contract) {
    this.pythContract = pythContract;
  }

  async getOnChainPriceFeed(priceId: HexString): Promise<PriceFeed> {
    const priceFeedRaw = await this.pythContract.methods
      .queryPriceFeed("0x" + removeLeading0x(priceId))
      .call();
    return new PriceFeed({
      id: removeLeading0x(priceFeedRaw.id),
      productId: removeLeading0x(priceFeedRaw.productId),
      price: priceFeedRaw.price,
      conf: priceFeedRaw.conf,
      expo: Number(priceFeedRaw.expo),
      status: statusNumberToEnum(Number(priceFeedRaw.status)),
      maxNumPublishers: Number(priceFeedRaw.maxNumPublishers),
      numPublishers: Number(priceFeedRaw.numPublishers),
      emaPrice: priceFeedRaw.emaPrice,
      emaConf: priceFeedRaw.emaConf,
      publishTime: Number(priceFeedRaw.publishTime),
      prevPrice: priceFeedRaw.prevPrice,
      prevConf: priceFeedRaw.prevConf,
      prevPublishTime: Number(priceFeedRaw.prevPublishTime),
    });
  }
}
