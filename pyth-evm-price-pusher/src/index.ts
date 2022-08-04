#!/usr/bin/env node

import Web3 from "web3";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import AbstractPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/AbstractPyth.json";
import {
  EvmPriceServiceConnection,
  CONTRACT_ADDR,
} from "@pythnetwork/pyth-evm-js";
import HDWalletProvider from "@truffle/hdwallet-provider";
import { removeLeading0x } from "./utils";
import { Pusher } from "./pusher";
import { Handler } from "./handler";
import { Querier } from "./querier";

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
  .option("mnemonic", {
    description: "Mnemonic (private key) for sender",
    type: "string",
    required: true,
  })
  .option("time-difference", {
    description: "Time difference (in seconds) to update a price feed",
    type: "number",
    required: true,
  })
  .option("price-deviation", {
    description: "Price deviation percent to update a price feed",
    type: "number",
    required: true,
  })
  .option("confidence-ratio", {
    description: "The confidence/price percent to update a price feed",
    type: "number",
    required: true,
  })
  .option("cooldown-duration", {
    description:
      "The time (in seconds) that it takes for a tx to get confirmed and be visible in queries to the RPC node.",
    type: "number",
    required: false,
    default: 10,
  })
  .option("batching-duration", {
    description:
      "The time (in seconds) that the relayer waits to group prices that need to be updated.",
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

const connection = new EvmPriceServiceConnection(argv.endpoint);

const provider = new HDWalletProvider({
  mnemonic: {
    phrase: argv.mnemonic,
  },
  providerOrUrl: network,
});

const web3 = new Web3(provider as any);

const pythContract = new web3.eth.Contract(
  AbstractPythAbi as any,
  pythContractAddr,
  {
    from: provider.getAddress(0),
  }
);

const pusher = new Pusher(connection, pythContract, {
  batchingDuration: argv.batchingDuration,
  cooldownDuration: argv.cooldownDuration,
});

const querier = new Querier(pythContract);

const handler = new Handler(pusher, querier, {
  confidenceRatioThreshold: argv.confidenceRatio,
  priceDeviationThreshold: argv.priceDeviation,
  timeDifferenceThreshold: argv.timeDifference,
});

// Listening to price id updates
const priceIds = (argv.priceIds as string[]).map(removeLeading0x);
connection.subscribePriceFeedUpdates(
  priceIds,
  handler.onPriceFeedUpdate.bind(handler)
);
