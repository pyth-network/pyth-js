import { PriceFeed, PriceStatus } from "@pythnetwork/pyth-evm-js";
import { PricePushingStatus, Pusher } from "./pusher";
import { Querier } from "./querier";
import { DurationInSeconds, PctNumber, sleep } from "./utils";

export class Handler {
  private pusher: Pusher;
  private querier: Querier;

  private timeDifferenceThreshold: DurationInSeconds;
  private priceDeviationThreshold: PctNumber;
  private confidenceRatioThreshold: PctNumber;

  constructor(
    pusher: Pusher,
    querier: Querier,
    config: {
      timeDifferenceThreshold: number;
      priceDeviationThreshold: number;
      confidenceRatioThreshold: number;
    }
  ) {
    this.pusher = pusher;
    this.querier = querier;

    this.timeDifferenceThreshold = config.timeDifferenceThreshold;
    this.priceDeviationThreshold = config.priceDeviationThreshold;
    this.confidenceRatioThreshold = config.confidenceRatioThreshold;
  }

  async onPriceFeedUpdate(newPriceFeed: PriceFeed) {
    console.log(`Got a new price with id: ${newPriceFeed.id}.`);

    // Waits until the price is being updated so the on-chain data be accurate.
    while (
      this.pusher.getPricePushingStatus(newPriceFeed.id) !==
      PricePushingStatus.IDLE
    ) {
      await sleep(1000);
    }

    const onChainPriceFeed = await this.querier.getOnChainPriceFeed(
      newPriceFeed.id
    );

    if (!this.shouldUpdate(onChainPriceFeed, newPriceFeed)) {
      return;
    }

    await this.pusher.sendUpdate(newPriceFeed);
  }

  /**
   * Checks whether on-chain price needs to be updated with a newer price information.
   *
   * @param onChainPriceFeed PriceFeed that exists on-chain.
   * @param newPriceFeed The new PriceFeed received from the Price Service.
   * @returns True if the on-chain price needs to be updated.
   */
  shouldUpdate(onChainPriceFeed: PriceFeed, newPriceFeed: PriceFeed): boolean {
    console.log(`Checking whether ${newPriceFeed.id} needs to be updated.`);

    if (onChainPriceFeed.status !== PriceStatus.Trading) {
      console.log(
        "On-chain price has a non-trading status. Will update the price."
      );
      // New price feed might have an non-trading status as well, but since it is newer
      // and some protocols might use getPrevPriceUnsafe() we will update the price regardless.
      return true;
    }

    if (newPriceFeed.status !== PriceStatus.Trading) {
      console.log("New price has a non-trading status. No update needed.");
      return false;
    }

    const newCurrentPrice = newPriceFeed.getCurrentPrice()!;
    const onChainCurrentPrice = onChainPriceFeed.getCurrentPrice()!;

    const timeDifference =
      newPriceFeed.publishTime - onChainPriceFeed.publishTime;
    const priceDeviationPct =
      (Math.abs(
        Number(newCurrentPrice.price) - Number(onChainCurrentPrice.price)
      ) /
        Number(onChainCurrentPrice.price)) *
      100;
    const confidenceRatioPct = Math.abs(
      (Number(newCurrentPrice.conf) / Number(newCurrentPrice.price)) * 100
    );

    console.log(
      `Time difference: ${timeDifference} (< ${this.timeDifferenceThreshold}?)`
    );
    console.log(
      `Price deviation: ${priceDeviationPct.toFixed(5)}% (< ${
        this.priceDeviationThreshold
      }%?)`
    );
    console.log(
      `Confidence ratio: ${confidenceRatioPct.toFixed(5)}% (< ${
        this.confidenceRatioThreshold
      }%?)`
    );

    const result =
      timeDifference >= this.timeDifferenceThreshold ||
      priceDeviationPct >= this.priceDeviationThreshold ||
      confidenceRatioPct >= this.confidenceRatioThreshold;

    if (result == true) {
      console.log(
        "Some of the above values passed the threshold. Will update the price."
      );
    } else {
      console.log(
        "None of the above values passed the threshold. No update needed."
      );
    }

    return result;
  }
}
