import Web3 from "web3";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { EvmPriceServiceConnection } from "../index";
import HDWalletProvider from "@truffle/hdwallet-provider";
import IWormhole from "../IWormholeAbi.json";

const argv = yargs(hideBin(process.argv))
    .option("network", {
        description: "RPC of the network to relay on.",
        type: "string",
        required: true,
    })
    .option("endpoint", {
        description:
            "Endpoint URL for the price service. e.g: https://endpoint/example",
        type: "string",
        required: true,
    })
    // This is actually the wormhole contract address (sorry, it's a hack)
    .option("pyth-contract", {
        description: "Pyth contract address.",
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

const network = argv.network;
const pythContractAddr = argv.pythContract;

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

    const wormholeContract = new web3.eth.Contract(
        IWormhole as any,
        pythContractAddr,
        {
            from: provider.getAddress(0),
        }
    );
    console.log("Made contract");

    const chainId = await wormholeContract.methods.chainId().call();
    console.log(`chainId: ${chainId}`)

    const guardianSetIndex = await wormholeContract.methods.getCurrentGuardianSetIndex().call();
    console.log(`guardianSetIndex: ${JSON.stringify(guardianSetIndex)}`);

    const result = await wormholeContract.methods.getGuardianSet(guardianSetIndex).call();
    console.log(`result: ${JSON.stringify(result)}`);

    const parsedVm = await wormholeContract.methods.parseVM(priceFeedUpdateData[0]).call();
    console.log(`parseVM result: ${JSON.stringify(parsedVm)}`);

    // This call fails
    const res = await wormholeContract.methods.parseAndVerifyVM(priceFeedUpdateData[0]).call();
    console.log(`parseAndVerifyVM result: ${JSON.stringify(res)}`);

    provider.engine.stop();
}

run();
