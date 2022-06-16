import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { PriceServiceConnection } from "../index";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const argv = yargs(hideBin(process.argv))
  .option("http", {
    description:
      "HTTP endpoint for the Price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("ws", {
    description:
      "Web Socket endpoint for the Price service. e.g: wss://endpoint/example",
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
  const connection = new PriceServiceConnection({
    httpEndpoint: argv.http,
    wsEndpoint: argv.ws,
    logger: console,
  });

  const priceIds = argv.priceIds as string[];
  const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
  console.log(priceFeeds);
  console.log(priceFeeds?.at(0)?.getCurrentPrice());

  if (argv.ws !== undefined) {
    console.log("Subscribing to Price Feed updates");

    await connection.startWebSocket();

    await connection.subscribePriceFeedUpdate(priceIds, (priceFeed) => {
      console.log(
        `Current price for ${priceFeed.id}: ${JSON.stringify(
          priceFeed.getCurrentPrice()
        )}`
      );
    });

    await sleep(600000);

    console.log("Unsubscribing Price Feed updates");
    await connection.unsubscribePriceFeedUpdate(priceIds);

    connection.stopWebSocket();
  }
}

run();
