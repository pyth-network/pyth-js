import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { CONTRACT_ADDR } from "../index";
import { PriceServiceConnection } from "@pythnetwork/pyth-common-js";
import { MsgExecuteContract } from "@terra-money/terra.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const argv = yargs(hideBin(process.argv))
  .option("endpoint", {
    description:
      "Endpoint URL for the Price Service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("price-ids", {
    description:
      "Space separated price feed ids (in hex) to fetch." +
      " e.g: f9c0172ba10dfa4d19088d...",
    type: "array",
    required: true,
  })
  .help()
  .alias("help", "h")
  .parserConfiguration({
    "parse-numbers": false,
  })
  .parseSync();

async function run() {
  const connection = new PriceServiceConnection(argv.endpoint, {
    logger: console, // Providing logger will allow the connection to log its events.
  });

  const priceIds = argv.priceIds as string[];
  console.log(priceIds);
  const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
  console.log(priceFeeds);
  console.log(priceFeeds?.at(0)?.getPriceNoOlderThan(60));

  const vaas = await connection.getLatestVaas(priceIds);
  const senderAddr = "terra123456789abcdefghijklmonpqrstuvwxyz1234";
  const pythContractAddr = CONTRACT_ADDR["testnet"];
  const msgs = vaas.map(
    (vaa) =>
      new MsgExecuteContract(senderAddr, pythContractAddr, {
        submit_vaa: {
          data: vaa,
        },
      })
  );
  console.log(msgs);

  console.log("Subscribing to price feed updates.");

  await connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
    console.log(
      `Current price for ${priceFeed.id}: ${JSON.stringify(
        priceFeed.getPriceNoOlderThan(60)
      )}.`
    );
  });

  await sleep(600000);

  // To close the websocket you should either unsubscribe from all
  // price feeds or call `connection.closeWebSocket()` directly.

  console.log("Unsubscribing from price feed updates.");
  await connection.unsubscribePriceFeedUpdates(priceIds);
}

run();
