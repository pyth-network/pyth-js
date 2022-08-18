import { EvmPriceServiceConnection, HexString } from "@pythnetwork/pyth-evm-js";
import { DurationInSeconds, PctNumber, sleep } from "./utils";
import { PriceListener } from "./price-listener";
import { Contract } from "web3-eth-contract";
import AbstractPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/AbstractPyth.json";
import Web3 from "web3";
import HDWalletProvider from "@truffle/hdwallet-provider";
import { PriceConfig } from "./price-config";

export class Pusher {
  private connection: EvmPriceServiceConnection;
  private pythContract: Contract;
  private targetPriceListener: PriceListener;
  private srcPriceListener: PriceListener;
  private priceConfigs: PriceConfig[];

  private cooldownDuration: DurationInSeconds;

  constructor(
    connection: EvmPriceServiceConnection,
    evmEndpoint: string,
    mnemonic: string,
    pythContractAddr: string,
    targetPriceListener: PriceListener,
    srcPriceListener: PriceListener,
    priceConfigs: PriceConfig[],
    config: {
      cooldownDuration: DurationInSeconds;
    }
  ) {
    this.connection = connection;
    this.targetPriceListener = targetPriceListener;
    this.srcPriceListener = srcPriceListener;
    this.priceConfigs = priceConfigs;

    this.cooldownDuration = config.cooldownDuration;

    const provider = new HDWalletProvider({
      mnemonic: {
        phrase: mnemonic,
      },
      providerOrUrl: evmEndpoint,
    });

    const web3 = new Web3(provider as any);

    this.pythContract = new web3.eth.Contract(
      AbstractPythAbi as any,
      pythContractAddr,
      {
        from: provider.getAddress(0),
      }
    );
  }

  async start() {
    while (true) {
      const pricesToPush = this.priceConfigs.filter(
        this.shouldUpdate.bind(this)
      );
      this.pushUpdates(pricesToPush);
      await sleep(this.cooldownDuration * 1000);
    }
  }

  async pushUpdates(pricesToPush: PriceConfig[]) {
    if (pricesToPush.length === 0) {
      return;
    }

    const priceFeedUpdateData = await this.connection.getPriceFeedsUpdateData(
      pricesToPush.map((priceConfig) => priceConfig.id)
    );

    console.log(
      "Pushing ",
      pricesToPush.map(
        (priceConfig) => `${priceConfig.alias} (${priceConfig.id})`
      )
    );

    this.pythContract.methods
      .updatePriceFeeds(priceFeedUpdateData)
      .send()
      .on("transactionHash", (hash: string) => {
        console.log(`Tx hash: ${hash}`);
      });
  }

  /**
   * Checks whether on-chain price needs to be updated with the latest pyth price information.
   *
   * @param priceConfig Config of the price feed to check
   * @returns True if the on-chain price needs to be updated.
   */
  shouldUpdate(priceConfig: PriceConfig): boolean {
    const priceId = priceConfig.id;

    const targetLatestPrice =
      this.targetPriceListener.getLatestPriceInfo(priceId);
    const srcLatestPrice = this.srcPriceListener.getLatestPriceInfo(priceId);

    // There is no price to update the target with.
    if (srcLatestPrice === undefined) {
      return false;
    }

    // It means that price never existed there. So we should push the latest price feed.
    if (targetLatestPrice === undefined) {
      console.log(
        `${priceConfig.alias} (${priceId}) is not available on the target network. Pushing the price.`
      );
      return true;
    }

    // The current price is not newer than the price onchain
    if (srcLatestPrice.publishTime < targetLatestPrice.publishTime) {
      return false;
    }

    const timeDifference =
      srcLatestPrice.publishTime - targetLatestPrice.publishTime;

    const priceDeviationPct =
      (Math.abs(
        Number(srcLatestPrice.price) - Number(targetLatestPrice.price)
      ) /
        Number(targetLatestPrice.price)) *
      100;
    const confidenceRatioPct = Math.abs(
      (Number(srcLatestPrice.conf) / Number(srcLatestPrice.price)) * 100
    );

    console.log(`Analyzing price ${priceConfig.alias} (${priceId})`);

    console.log(
      `Time difference: ${timeDifference} (< ${priceConfig.timeDifference}?)`
    );
    console.log(
      `Price deviation: ${priceDeviationPct.toFixed(5)}% (< ${
        priceConfig.priceDeviation
      }%?)`
    );
    console.log(
      `Confidence ratio: ${confidenceRatioPct.toFixed(5)}% (< ${
        priceConfig.confidenceRatio
      }%?)`
    );

    const result =
      timeDifference >= priceConfig.timeDifference ||
      priceDeviationPct >= priceConfig.priceDeviation ||
      confidenceRatioPct >= priceConfig.confidenceRatio;

    if (result == true) {
      console.log(
        "Some of the above values passed the threshold. Will push the price."
      );
    } else {
      console.log(
        "None of the above values passed the threshold. No push needed."
      );
    }

    return result;
  }
}
