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
  .option("evm-endpoint", {
    description:
      "RPC endpoint URL for the EVM network. If you provide a websocket RPC endpoint (`ws[s]://...`), " +
      "the price pusher will use event subscriptions to read the current EVM price. If you provide " +
      "a normal HTTP endpoint, the pusher will periodically poll for updates. The polling interval " +
      "is configurable via the `evm-polling-frequency` command-line argument",
    type: "string",
    required: true,
  })
  .option("price-endpoint", {
    description:
      "Endpoint URL for the price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("pyth-contract", {
    description:
      "Pyth contract address. Provide the network name on which Pyth is deployed " +
      "or the Pyth contract address if you use a local network.",
    type: "string",
    required: true,
  })
  .option("price-ids", {
    description:
      "Space separated price feed ids (in hex) to push." +
      " e.g: 0xf9c0172ba10dfa4d19088d...",
    type: "array",
    required: true,
  })
  .option("mnemonic-file", {
    description: "Payer mnemonic (private key) file.",
    type: "string",
    required: true,
  })
  .option("time-difference", {
    description:
      "Time difference threshold (in seconds) to push a newer price feed.",
    type: "number",
    required: true,
  })
  .option("price-deviation", {
    description:
      "The price deviation (%) threshold to push a newer price feed.",
    type: "number",
    required: true,
  })
  .option("confidence-ratio", {
    description:
      "The confidence/price (%) threshold to push a newer price feed.",
    type: "number",
    required: true,
  })
  .option("cooldown-duration", {
    description:
      "The amount of time (in seconds) to wait between pushing price updates. " +
      "This value should be greater than the block time of the network, so this program confirms " +
      "it is updated and does not push it twice.",
    type: "number",
    required: false,
    default: 10,
  })
  .option("evm-polling-frequency", {
    description:
      "The frequency to poll price info data from the EVM network if the RPC is not a websocket.",
    type: "number",
    required: false,
    default: 5,
  })
  .help()
  .alias("help", "h")
  .parserConfiguration({
    "parse-numbers": false,
  })
  .parseSync();

const network = argv.evmEndpoint;
let pythContractAddr: string;

if (CONTRACT_ADDR[argv.pythContract] !== undefined) {
  pythContractAddr = CONTRACT_ADDR[argv.pythContract];
} else {
  pythContractAddr = argv.pythContract;
}

async function run() {
  const connection = new EvmPriceServiceConnection(argv.priceEndpoint);

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
