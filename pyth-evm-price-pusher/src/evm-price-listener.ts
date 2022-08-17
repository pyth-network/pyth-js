import { HexString, Price, PriceFeed } from "@pythnetwork/pyth-evm-js";

import AbstractPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/AbstractPyth.json";
import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { PriceInfo, PriceListener } from "./price-listener";
import {
  addLeading0x,
  DurationInSeconds,
  isWsEndpoint,
  removeLeading0x,
  sleep,
  statusNumberToEnum,
} from "./utils";

export class EvmPriceListener implements PriceListener {
  private pythContract: Contract;
  private latestPriceInfo: Map<HexString, PriceInfo>;
  private priceIds: HexString[];

  private isWs: boolean;
  private pollingFrequency: DurationInSeconds;

  constructor(
    endpoint: string,
    pythContractAddr: string,
    priceIds: HexString[],
    config: {
      pollingFrequency: DurationInSeconds;
    }
  ) {
    this.latestPriceInfo = new Map();
    this.priceIds = priceIds;

    this.pollingFrequency = config.pollingFrequency;

    const web3 = new Web3(endpoint);
    this.isWs = isWsEndpoint(endpoint);

    this.pythContract = new web3.eth.Contract(
      AbstractPythAbi as any,
      pythContractAddr
    );
  }

  // This method should be awaited on and once it finishes it has the latest value
  // for the given price feeds (if they exist).
  async start() {
    if (this.isWs) {
      console.log("Subscribing to the target network pyth contract events...");
      this.startSubscription();
    } else {
      console.log(
        "The target network RPC endpoint is not Websocket. Using polling instead..."
      );
      setInterval(this.pollPrices.bind(this), this.pollingFrequency * 1000);
    }

    // Poll the prices to have values in the beginning until updates arrive.
    console.log(
      "Polling the prices in the beginning in order to set the initial values."
    );
    await this.pollPrices();
  }

  private async startSubscription() {
    for (let priceId of this.priceIds) {
      this.pythContract.events.PriceFeedUpdate(
        {
          filter: {
            id: addLeading0x(priceId),
            fresh: true,
          },
        },
        this.onPriceFeedUpdate.bind(this)
      );
    }
  }

  private onPriceFeedUpdate(err: Error | null, event: EventData) {
    if (err !== null) {
      console.error("PriceFeedUpdate EventEmitter received an error.");
      console.error(err);
      return;
    }

    const priceId = removeLeading0x(event.returnValues.id);
    console.log(
      `Received a new Evm PriceFeedUpdate event for price feed with id ${priceId}`
    );

    const priceInfo: PriceInfo = {
      conf: event.returnValues.conf,
      price: event.returnValues.price,
      publishTime: Number(event.returnValues.publishTime),
    };

    this.latestPriceInfo.set(priceId, priceInfo);
  }

  private async pollPrices() {
    console.log("Polling evm prices...");
    for (let priceId of this.priceIds) {
      const currentPriceInfo = await this.getOnChainPriceInfo(priceId);
      if (currentPriceInfo !== undefined) {
        this.latestPriceInfo.set(priceId, currentPriceInfo);
      }
    }
  }

  getLatestPriceInfo(priceId: string): PriceInfo | undefined {
    return this.latestPriceInfo.get(priceId);
  }

  async getOnChainPriceInfo(
    priceId: HexString
  ): Promise<PriceInfo | undefined> {
    let priceFeedRaw;
    try {
      priceFeedRaw = await this.pythContract.methods
        .queryPriceFeed(addLeading0x(priceId))
        .call();
    } catch (e) {
      console.error(`Getting on-chain price for ${priceId} failed. Error:`);
      console.error(e);
      return undefined;
    }

    const priceFeed = new PriceFeed({
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

    const latestAvailablePrice = priceFeed.getLatestAvailablePriceUnchecked();

    return {
      conf: latestAvailablePrice[0].conf,
      price: latestAvailablePrice[0].price,
      publishTime: latestAvailablePrice[1],
    };
  }
}
