import { HexString } from "@pythnetwork/pyth-evm-js";

import AbstractPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/AbstractPyth.json";
import Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import { PriceConfig } from "./price-config";
import { PriceInfo, PriceListener } from "./price-listener";
import {
  addLeading0x,
  DurationInSeconds,
  isWsEndpoint,
  removeLeading0x,
} from "./utils";

export class EvmPriceListener implements PriceListener {
  private pythContract: Contract;
  private latestPriceInfo: Map<HexString, PriceInfo>;
  private priceIds: HexString[];
  private priceIdToAlias: Map<HexString, string>;

  private isWs: boolean;
  private pollingFrequency: DurationInSeconds;

  constructor(
    endpoint: string,
    pythContractAddr: string,
    priceConfigs: PriceConfig[],
    config: {
      pollingFrequency: DurationInSeconds;
    }
  ) {
    this.latestPriceInfo = new Map();
    this.priceIds = priceConfigs.map((priceConfig) => priceConfig.id);
    this.priceIdToAlias = new Map(
      priceConfigs.map((priceConfig) => [priceConfig.id, priceConfig.alias])
    );

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
        "The target network RPC endpoint is not Websocket. " +
          "Listening for updates only via polling...."
      );
    }

    console.log(`Polling the prices every ${this.pollingFrequency} seconds...`);
    setInterval(this.pollPrices.bind(this), this.pollingFrequency * 1000);

    await this.pollPrices();
  }

  private async startSubscription() {
    for (const priceId of this.priceIds) {
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
      `Received a new Evm PriceFeedUpdate event for price feed ${this.priceIdToAlias.get(
        priceId
      )} (${priceId}).`
    );

    const priceInfo: PriceInfo = {
      conf: event.returnValues.conf,
      price: event.returnValues.price,
      publishTime: Number(event.returnValues.publishTime),
    };

    this.updateLatestPriceInfo(priceId, priceInfo);
  }

  private async pollPrices() {
    console.log("Polling evm prices...");
    for (const priceId of this.priceIds) {
      const currentPriceInfo = await this.getOnChainPriceInfo(priceId);
      if (currentPriceInfo !== undefined) {
        this.updateLatestPriceInfo(priceId, currentPriceInfo);
      }
    }
  }

  getLatestPriceInfo(priceId: string): PriceInfo | undefined {
    return this.latestPriceInfo.get(priceId);
  }

  async getOnChainPriceInfo(
    priceId: HexString
  ): Promise<PriceInfo | undefined> {
    let priceRaw;
    try {
      priceRaw = await this.pythContract.methods
        .getPriceUnsafe(addLeading0x(priceId))
        .call();
    } catch (e) {
      console.error(`Getting on-chain price for ${priceId} failed. Error:`);
      console.error(e);
      return undefined;
    }

    return {
      conf: priceRaw.conf,
      price: priceRaw.price,
      publishTime: Number(priceRaw.publishTime),
    };
  }

  private updateLatestPriceInfo(priceId: HexString, observedPrice: PriceInfo) {
    const cachedLatestPriceInfo = this.getLatestPriceInfo(priceId);

    // Ignore the observed price if the cache already has newer
    // price. This could happen because we are using polling and
    // subscription at the same time.
    if (
      cachedLatestPriceInfo !== undefined &&
      cachedLatestPriceInfo.publishTime > observedPrice.publishTime
    ) {
      return;
    }

    this.latestPriceInfo.set(priceId, observedPrice);
  }
}
