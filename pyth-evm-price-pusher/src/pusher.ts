import {
  EvmPriceServiceConnection,
  UnixTimestamp,
} from "@pythnetwork/pyth-evm-js";
import { addLeading0x, DurationInSeconds, sleep } from "./utils";
import { PriceListener } from "./price-listener";
import { Contract } from "web3-eth-contract";
import { PriceConfig, shouldUpdate } from "./price-config";
import { TransactionReceipt } from "ethereum-protocol";
import { PythContractFactory } from "./pyth-contract-factory";

export class Pusher {
  private connection: EvmPriceServiceConnection;
  private pythContract: Contract;
  private pythContractFactory: PythContractFactory;
  private targetPriceListener: PriceListener;
  private sourcePriceListener: PriceListener;
  private priceConfigs: PriceConfig[];

  private cooldownDuration: DurationInSeconds;

  constructor(
    connection: EvmPriceServiceConnection,
    pythContractFactory: PythContractFactory,
    targetPriceListener: PriceListener,
    sourcePriceListener: PriceListener,
    priceConfigs: PriceConfig[],
    config: {
      cooldownDuration: DurationInSeconds;
    }
  ) {
    this.connection = connection;
    this.targetPriceListener = targetPriceListener;
    this.sourcePriceListener = sourcePriceListener;
    this.priceConfigs = priceConfigs;

    this.cooldownDuration = config.cooldownDuration;

    this.pythContractFactory = pythContractFactory;
    this.pythContract = this.pythContractFactory.createPythContractWithPayer();
  }

  async start() {
    for (;;) {
      const pricesToPush: PriceConfig[] = [];
      const pubTimesToPush: UnixTimestamp[] = [];

      for (const priceConfig of this.priceConfigs) {
        const priceId = priceConfig.id;

        const targetLatestPrice =
          this.targetPriceListener.getLatestPriceInfo(priceId);
        const sourceLatestPrice =
          this.sourcePriceListener.getLatestPriceInfo(priceId);

        if (shouldUpdate(priceConfig, sourceLatestPrice, targetLatestPrice)) {
          pricesToPush.push(priceConfig);
          pubTimesToPush.push((targetLatestPrice?.publishTime || 0) + 1);
        }
      }
      this.pushUpdates(pricesToPush, pubTimesToPush);
      await sleep(this.cooldownDuration * 1000);
    }
  }

  // The pubTimes are passed here to use the values that triggered the push.
  // This is an optimization to avoid getting a newer value (as an update comes)
  // and will help multiple price pushers to have consistent behaviour.
  async pushUpdates(
    pricesToPush: PriceConfig[],
    pubTimesToPush: UnixTimestamp[]
  ) {
    if (pricesToPush.length === 0) {
      return;
    }

    const priceIds = pricesToPush.map((priceConfig) =>
      addLeading0x(priceConfig.id)
    );

    const priceFeedUpdateData = await this.connection.getPriceFeedsUpdateData(
      priceIds
    );

    console.log(
      "Pushing ",
      pricesToPush.map(
        (priceConfig) => `${priceConfig.alias} (${priceConfig.id})`
      )
    );

    const updateFee = await this.pythContract.methods
      .getUpdateFee(priceFeedUpdateData)
      .call();
    console.log(`Update fee: ${updateFee}`);

    this.pythContract.methods
      .updatePriceFeedsIfNecessary(
        priceFeedUpdateData,
        priceIds,
        pubTimesToPush
      )
      .send({ value: updateFee })
      .on("transactionHash", (hash: string) => {
        console.log(`Successful. Tx hash: ${hash}`);
      })
      .on("error", (err: Error, receipt?: TransactionReceipt) => {
        if (
          err.message.includes(
            "VM Exception while processing transaction: revert"
          )
        ) {
          // Since we are using custom error structs on solidity the rejection
          // doesn't return any information why the call has reverted. Assuming that
          // the update data is valid there is no possible rejection cause other than
          // the target chain price being already updated.
          console.log(
            "Execution reverted. With high probablity, the target chain price " +
              "has already updated, Skipping this push."
          );
          return;
        }

        if (
          err.message.includes("the tx doesn't have the correct nonce.") ||
          err.message.includes("nonce too low")
        ) {
          console.log(
            "Multiple users are using the same accounts and nonce is incorrect. Skipping this push."
          );
          return;
        }

        if (
          err.message.includes("sender doesn't have enough funds to send tx.")
        ) {
          console.error("Payer is out of balance, please top it up.");
          throw err;
        }

        console.error("An unidentified error has occured:");
        console.error(receipt);
        throw err;
      });
  }
}
