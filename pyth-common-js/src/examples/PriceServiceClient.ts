import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { PriceServiceConnection } from "../index";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const argv = yargs(hideBin(process.argv))
  .option("endpoint", {
    description:
      "Endpoint for the price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("wsEndpoint", {
    description:
      "Optional web socket endpoint for the price service if it's different than endpoint. e.g: wss://endpoint/example",
    type: "string",
    required: false,
  })
  .option("price-ids", {
    description:
      "Space separated Price Feed Ids (in hex without leading 0x) to fetch." +
      " e.g: f9c0172ba10dfa4d19088d...",
    type: "array",
    required: true,
  })
  .help()
  .alias("help", "h")
  .parseSync();

async function run() {
  const connection = new PriceServiceConnection(argv.endpoint, {
    wsEndpoint: argv.wsEndpoint,
    logger: console, // Providing logger will allow the connection to log it's events.
  });

  const priceIds = argv.priceIds as string[];
  const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
  console.log(priceFeeds);
  console.log(priceFeeds?.at(0)?.getCurrentPrice());

  console.log("Subscribing to price feed updates.");

  await connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
    console.log(
      `Current price for ${priceFeed.id}: ${JSON.stringify(
        priceFeed.getCurrentPrice()
      )}.`
    );
  });

  await sleep(600000);

  // To close the websocket you should either unsubscribe from all
  // price feeds or call `connection.stopWebSocket()` directly.

  console.log("Unsubscribing from price feed updates.");
  await connection.unsubscribePriceFeedUpdates(priceIds);

  // connection.closeWebSocket();
}

run();
