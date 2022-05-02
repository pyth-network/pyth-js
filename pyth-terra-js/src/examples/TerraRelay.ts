import { LCDClient, MnemonicKey } from "@terra-money/terra.js";
import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { TerraPriceServiceConnection, DurationInMs } from "../index";

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
    type: "string",
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
    pythContractAddr: "terra1wzs3rgzgjdde3kg7k3aaz6qx7sc5dcwxqe9fuc"
  }
}

export const TERRA_GAS_PRICES_URL = "https://fcd.terra.dev/v1/txs/gas_prices";

const terraHost = CONFIG[argv.network].terraHost;
const pythContractAddr = CONFIG[argv.network].pythContractAddr;
const feeDenoms = ["uluna"];

const connection = new TerraPriceServiceConnection({ httpEndpoint: argv.http });
const lcd = new LCDClient(terraHost);
const wallet = lcd.wallet(new MnemonicKey({
  mnemonic: argv.mnemonic
}));
const priceId = argv.priceId;

async function run() {
  const priceFeed = await connection.getLatestPriceFeed([priceId]);
  console.log(priceFeed);

  const gasPrices = await axios
    .get(TERRA_GAS_PRICES_URL)
    .then((result) => result.data);

  const msg = await connection.getPythPriceUpdateMessage(priceId, pythContractAddr, wallet.key.accAddress);
  console.log(msg);

  const feeEstimate = await lcd.tx.estimateFee(
    [{
      sequenceNumber: await wallet.sequence(),
    }],
    {
      msgs: [msg],
      feeDenoms,
      gasPrices,
    }
  );

  const tx = await wallet.createAndSignTx({
    msgs: [msg],
    feeDenoms,
    gasPrices,
    fee: feeEstimate,
  });

  const rs = await lcd.tx.broadcastSync(tx);
  console.log("Relay successful.", rs.txhash);
}

run();
