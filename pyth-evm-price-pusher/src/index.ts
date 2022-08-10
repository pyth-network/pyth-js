#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  EvmPriceServiceConnection,
  CONTRACT_ADDR,
} from "@pythnetwork/pyth-evm-js";
import { removeLeading0x } from "./utils";
import { Pusher } from "./pusher";
import { EvmPriceListener } from "./evm-price-listener";
import { PythPriceListener } from "./pyth-price-listener";
import * as fs from "fs";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    description:
      "RPC of the target EVM network. Use ws[s]:// if you intent to use subscription " +
      "instead of polling.",
    type: "string",
    required: true,
  })
  .option("endpoint", {
    description:
      "Endpoint URL for the price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("pyth-contract", {
    description:
      "Pyth contract address. Provide the network name which Pyth is deployed on, " +
      "or the Pyth contract address if you are using a local network",
    type: "string",
    required: true,
  })
  .option("price-ids", {
    description:
      "Space separated price feed ids (in hex) to fetch" +
      " e.g: 0xf9c0172ba10dfa4d19088d...",
    type: "array",
    required: true,
  })
  .option("mnemonic-file", {
    description: "Payer mnemonic (private key) file",
    type: "string",
    required: true,
  })
  .option("time-difference", {
    description: "Time difference (in seconds) to push a price feed",
    type: "number",
    required: true,
  })
  .option("price-deviation", {
    description: "Price deviation percent to push a price feed",
    type: "number",
    required: true,
  })
  .option("confidence-ratio", {
    description: "The confidence/price percent to push a price feed",
    type: "number",
    required: true,
  })
  .option("cooldown-duration", {
    description:
      "The amount of time (in seconds) to wait between pushing price updates. " +
      "Should be greater than the block time of the network so one update is not " +
      "pushed twice.",
    type: "number",
    required: false,
    default: 10,
  })
  .option("evm-polling-frequency", {
    description:
      "The frequency to poll price info data from the evm network if the RPC is not a websocket.",
    type: "number",
    required: false,
    default: 10,
  })
  .help()
  .alias("help", "h")
  .parserConfiguration({
    "parse-numbers": false,
  })
  .parseSync();

const network = argv.network;
let pythContractAddr: string;

if (CONTRACT_ADDR[argv.pythContract] !== undefined) {
  pythContractAddr = CONTRACT_ADDR[argv.pythContract];
} else {
  pythContractAddr = argv.pythContract;
}

async function run() {
  const connection = new EvmPriceServiceConnection(argv.endpoint);

  const priceIds = (argv.priceIds as string[]).map(removeLeading0x);

  const evmPriceListener = new EvmPriceListener(
    network,
    pythContractAddr,
    priceIds,
    {
      pollingFrequency: argv.evmPollingFrequency,
    }
  );

  const pythPriceListener = new PythPriceListener(connection, priceIds);

  const handler = new Pusher(
    connection,
    network,
    fs.readFileSync(argv.mnemonicFile).toString().trim(),
    pythContractAddr,
    evmPriceListener,
    pythPriceListener,
    priceIds,
    {
      confidenceRatioThreshold: argv.confidenceRatio,
      priceDeviationThreshold: argv.priceDeviation,
      timeDifferenceThreshold: argv.timeDifference,
      cooldownDuration: argv.cooldownDuration,
    }
  );

  await evmPriceListener.start();
  await pythPriceListener.start();

  // Handler starts after the above listeners are started
  // which means that they have fetched their initial price information.
  await handler.start();
}

run();
