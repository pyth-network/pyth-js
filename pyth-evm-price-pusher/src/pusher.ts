import {
  EvmPriceServiceConnection,
  HexString,
  PriceFeed,
} from "@pythnetwork/pyth-evm-js";
import { Contract } from "web3-eth-contract";
import { DurationInSeconds, sleep } from "./utils";

export enum PricePushingStatus {
  IDLE,
  BATCHING,
  COOLDOWN,
}

export class Pusher {
  private connection: EvmPriceServiceConnection;
  private pythContract: Contract;
  private pricePushingStatus: Map<HexString, PricePushingStatus>;
  private currentBatch: PriceFeed[];

  private batchingDuration: DurationInSeconds;
  private cooldownDuration: DurationInSeconds;

  constructor(
    connection: EvmPriceServiceConnection,
    pythContract: Contract,
    config: {
      batchingDuration: number;
      cooldownDuration: number;
    }
  ) {
    this.connection = connection;
    this.pythContract = pythContract;

    this.batchingDuration = config.batchingDuration;
    this.cooldownDuration = config.cooldownDuration;

    this.pricePushingStatus = new Map();
    this.currentBatch = [];
  }

  getPricePushingStatus(priceId: HexString): PricePushingStatus {
    return this.pricePushingStatus.get(priceId) || PricePushingStatus.IDLE;
  }

  async sendUpdate(priceFeed: PriceFeed) {
    if (this.currentBatch.length === 0) {
      setTimeout(this.sendBatch.bind(this), this.batchingDuration * 1000);
    }
    this.pricePushingStatus.set(priceFeed.id, PricePushingStatus.BATCHING);
    this.currentBatch.push(priceFeed);
  }

  private async sendBatch() {
    const sendingBatch = this.currentBatch;
    this.currentBatch = [];

    const priceFeedUpdateData = await this.connection.getPriceFeedsUpdateData(
      sendingBatch.map((priceFeed) => priceFeed.id)
    );

    console.log(
      "Updating ",
      sendingBatch.map((priceFeed) => priceFeed.id)
    );

    this.pythContract.methods
      .updatePriceFeeds(priceFeedUpdateData)
      .send()
      .on("transactionHash", (hash: string) => {
        console.log(`Tx hash: ${hash}`);
      });

    sendingBatch.forEach((priceFeed) => {
      this.pricePushingStatus.set(priceFeed.id, PricePushingStatus.COOLDOWN);
    });

    await sleep(this.cooldownDuration * 1000);

    sendingBatch.forEach((priceFeed) => {
      this.pricePushingStatus.set(priceFeed.id, PricePushingStatus.IDLE);
    });
  }
}
