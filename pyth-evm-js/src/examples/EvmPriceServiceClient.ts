import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { CONTRACT_ADDR, EvmPriceServiceConnection } from "../index";

const argv = yargs(hideBin(process.argv))
  .option("http", {
    description:
      "HTTP endpoint for the Price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
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
  const connection = new EvmPriceServiceConnection({
    httpEndpoint: argv.http,
  });
  console.log(argv.priceIds);
  const priceFeeds = await connection.getLatestPriceFeeds(
    argv.priceIds as string[]
  );
  console.log(priceFeeds);
  console.log(priceFeeds?.at(0)?.getCurrentPrice());

  const updateData = await connection.getPriceFeedsUpdateData(
    argv.priceIds as string[]
  );
  console.log(updateData);
}

run();
