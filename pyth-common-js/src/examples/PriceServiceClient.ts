import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { PriceServiceConnection } from "../PriceServiceConnection";

const argv = yargs(hideBin(process.argv))
  .option('endpoint', {
    description: 'Which endpoints to use',
    type: 'string',
    required: true
  })
  .option('price-id', {
    description: 'Which price id to query',
    type: 'array',
    required: true
  })
  .help()
  .alias('help', 'h').parseSync();

async function run() {
    let x = new PriceServiceConnection({ endpoint: argv.endpoint });
    let priceFeed = await x.getLatestPriceFeeds(
      argv.priceId as string[]
    );
    console.log(priceFeed);
    console.log(priceFeed?.at(0)?.getCurrentPrice());
    console.log(await x.getLatestVaaBytes(argv.priceId.at(0) as string));
  }
  
  run();
  