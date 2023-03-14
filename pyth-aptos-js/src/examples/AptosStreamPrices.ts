import { PriceFeed } from "@pythnetwork/pyth-common-js";
import { AptosPriceServiceConnection } from "../AptosPriceServiceConnection";

const connection = new AptosPriceServiceConnection(
  "https://xc-testnet.pyth.network"
); // See Price Service endpoints section below for other endpoints

const priceIds = [
  // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#aptos-testnet
  "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
  "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
];

// Subscribe to the price feeds given by `priceId`. The callback will be invoked every time the requested feed
// gets a price update.
connection.subscribePriceFeedUpdates(priceIds, (priceFeed: PriceFeed) => {
  const price = priceFeed.getPriceNoOlderThan(60);
  if (price) {
    console.log(
      `Received update for ${priceFeed.id}: ${
        Number(price?.price) * 10 ** price?.expo
      }`
    );
  }
});

// When using the subscription, make sure to close the websocket upon termination to finish the process gracefully.
setTimeout(() => {
  connection.closeWebSocket();
}, 60000);
