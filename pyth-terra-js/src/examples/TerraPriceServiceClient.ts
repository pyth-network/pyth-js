import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { TerraPriceServiceConnection } from "../index";

const argv = yargs(hideBin(process.argv))
  .option("http", {
    description: "HTTP endpoint for the Price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("price-id", {
    description: "Price id (in hex without leading 0x) to fetch" +
    ", you can provide more than one price id. e.g: f9c0172ba10dfa4d19088d...",
    type: "array",
    required: true,
  })
  .help()
  .alias("help", "h")
  .parseSync();

async function run() {
  const connection = new TerraPriceServiceConnection({ httpEndpoint: argv.http });
  const priceFeed = await connection.getLatestPriceFeed(argv.priceId as string[]);
  console.log(priceFeed);
  console.log(priceFeed?.at(0)?.getCurrentPrice());
  console.log(await connection.getPythPriceUpdateMessage(argv.priceId.at(0) as string, "123", "123"));
}

run();
