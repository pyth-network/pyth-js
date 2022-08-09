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
      "Network to relay on. Provide node url if you are using anything other than " +
      "[bnb_testnet, fuji, fantom_testnet, ropsten, goerli, mumbai, aurora_testnet]",
    required: true,
    default: "bnb_testnet",
  })
  .option("endpoint", {
    description:
      "Endpoint URL for the price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("pyth-contract", {
    description:
      "Pyth contract address. You should provide this value if you are using a local network",
    type: "string",
    required: false,
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

const CONFIG: Record<string, any> = {
  bnb_testnet: {
    network: "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
  fuji: {
    network: "https://api.avax-test.network/ext/bc/C/rpc",
  },
  fantom_testnet: {
    network: "https://rpc.testnet.fantom.network/",
  },
  ropsten: {
    network: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  },
  goerli: {
    network: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  },
  mumbai: {
    network: "https://matic-mumbai.chainstacklabs.com",
  },
  aurora_testnet: {
    network: "https://testnet.aurora.dev",
  },
};

let network: string;
let pythContractAddr: string;

if (CONFIG[argv.network] !== undefined) {
  network = CONFIG[argv.network].network;
  pythContractAddr = CONTRACT_ADDR[argv.network];
} else {
  network = argv.network;
  if (argv.pythContract === undefined) {
    throw new Error(
      "You should provide pyth contract address when using a custom network"
    );
  }
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
  await handler.start();
}

run();
