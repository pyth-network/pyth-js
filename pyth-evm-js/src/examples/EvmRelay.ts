import Web3 from "web3";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { EvmPriceServiceConnection, CONTRACT_ADDR } from "../index";
import HDWalletProvider from "@truffle/hdwallet-provider";
import PythInterfaceAbi from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json";

const argv = yargs(hideBin(process.argv))
  .option("network", {
    description:
      "Network to relay on. Provide node url if you are using anything other than " +
      "[bnb_testnet, fuji, fantom_testnet, ropsten, goerli, mumbai]",
    required: true,
    default: "bsc_testnet",
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

async function run() {
  const provider = new HDWalletProvider({
    mnemonic: {
      phrase: argv.mnemonic,
    },
    providerOrUrl: network,
  });

  const web3 = new Web3(provider);
  const priceIds = argv.priceIds as string[];

  const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
  console.log(priceFeeds);

  const priceFeedUpdateData = await connection.getPriceFeedsUpdateData(
    priceIds
  );
  console.log(priceFeedUpdateData);

  const pythContract = new web3.eth.Contract(
    PythInterfaceAbi as any,
    pythContractAddr,
    {
      from: provider.getAddress(0),
    }
  );

  const updateFee = await pythContract.methods
    .getUpdateFee(priceFeedUpdateData)
    .call();
  console.log(`Update fee: ${updateFee}`);

  pythContract.methods
    .updatePriceFeeds(priceFeedUpdateData)
    .send({ value: updateFee })
    .on("transactionHash", (hash: string) => {
      console.log(`Tx hash: ${hash}`);
    });

  provider.engine.stop();
}

run();
