import { LCDClient, MnemonicKey } from "@terra-money/terra.js";
import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { TerraPriceServiceConnection, CONTRACT_ADDR } from "../index";

const argv = yargs(hideBin(process.argv))
  .option('network', {
    description: 'Which network to relay',
    choices: ['testnet'],
    required: false,
    default: 'testnet',
  })
  .option("http", {
    description: "HTTP endpoint for the Price service. e.g: https://endpoint/example",
    type: "string",
    required: true,
  })
  .option("price-id", {
    description: "Price id (in hex) to relay",
    type: "array",
    required: true,
  })
  .option('mnemonic', {
    description: 'Mnemonic (private key) for sender',
    type: 'string',
    required: true
  })
  .help()
  .alias("help", "h")
  .parseSync();

const CONFIG: Record<string, any>  = {
  testnet: {
    terraHost: {
      URL: "https://bombay-lcd.terra.dev",
      chainID: "bombay-12",
      name: "testnet",
    },
  }
}

export const TERRA_GAS_PRICES_URL = "https://fcd.terra.dev/v1/txs/gas_prices";

const terraHost = CONFIG[argv.network].terraHost;
const pythContractAddr = CONTRACT_ADDR[argv.network];
const feeDenoms = ["uluna"];

const connection = new TerraPriceServiceConnection({ httpEndpoint: argv.http });
const lcd = new LCDClient(terraHost);
const wallet = lcd.wallet(new MnemonicKey({
  mnemonic: argv.mnemonic
}));
const priceIds = argv.priceId as string[];

async function run() {
  const priceFeed = await connection.getLatestPriceFeed(priceIds);
  console.log(priceFeed);

  const gasPrices = await axios
    .get(TERRA_GAS_PRICES_URL)
    .then((result) => result.data);

  const msgs = await connection.getPythPriceUpdateMessage(priceIds, pythContractAddr, wallet.key.accAddress);
  console.log(msgs);

  const feeEstimate = await lcd.tx.estimateFee(
    [{
      sequenceNumber: await wallet.sequence(),
    }],
    {
      msgs: msgs,
      feeDenoms,
      gasPrices,
    }
  );

  const tx = await wallet.createAndSignTx({
    msgs: msgs,
    feeDenoms,
    gasPrices,
    fee: feeEstimate,
  });

  const rs = await lcd.tx.broadcastSync(tx);
  console.log("Relay successful.", rs.txhash);
}

run();
