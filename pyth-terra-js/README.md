# Pyth Terra JS

[Pyth](https://pyth.network/) provides real-time pricing data in a variety of asset classes, including cryptocurrency, equities, FX and commodities. This library allows you to use these real-time prices in Terra DeFi protocols.

## Installation

### npm

```
$ npm install --save @pythnetwork/pyth-terra-js
```

### Yarn

```
$ yarn add @pythnetwork/pyth-terra-js
```

## Quickstart

Pyth stores prices off-chain to minimize gas fees, which allows us to offer a wider selection of products and faster update times.
See [How Pyth Works in Terra](#how-pyth-works-in-terra) for more details about this approach. In order to use Pyth prices on chain,
they must be fetched from an off-chain price service. The TerraPriceServiceConnection class can be used to interact with these services,
providing a way to fetch these prices directly in your code. The following example wraps an existing RPC provider and shows how to consume
Pyth prices before submitting them to Terra:

```typescript
const connection = new TerraPriceServiceConnection({
  httpEndpoint: "https://website/example",
});

const priceIds = [
  // You can find the ids of prices at https://pyth.network/developers/price-feeds#terra-testnet
  "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
  "6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2", // LUNA/USD price id in testnet
];

// `getLatestPriceFeeds` returns a `PriceFeed` for each price id. It contains all information about a price and has
// utility functions to get the current and exponentially-weighted moving average price, and other functionality.
const priceFeeds = connection.getLatestPriceFeeds(priceIds);
console.log(priceFeeds[0].getCurrentPrice()); // Price { conf: '1234', expo: -8, price: '12345678' }
console.log(priceFeeds[1].getEmaPrice()); // Exponentially-weighted moving average price

// In order to use Pyth prices in your protocol you need to submit the latest price to the Terra network alongside your
// own transactions. `getPriceUpdateMessages` creates messages that can update the prices.
const pythContractAddr = CONTRACT_ADDR["testnet"];
const msgs = await connection.getPriceUpdateMessages(
  priceIds,
  pythContractAddr,
  wallet.key.accAddress
);
const tx = await wallet.createAndSignTx({
  msgs: [...pythMsgs, otherMsg, anotherMsg],
});
```

We strongly recommend reading our guide which explains [how to work with Pyth price feeds](https://docs.pyth.network/consume-data/best-practices).

### Examples

There are two examples in [examples](./src/examples/).

#### TerraPriceServiceClient

[This example](./src/examples/TerraPriceServiceClient.ts) fetches a `PriceFeed` for each given price id and prints them. You can run it with `npm run example-client`. A full command that prints BTC and LUNA Price Feeds, in the testnet network, looks like so:

```bash
npm run example-client -- --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2
```

#### TerraRelay

[This example](./src/examples/TerraRelay.ts) shows how to update prices on the Terra network. It does the following:

1. Creates an update message for each given price id.
2. Creates a transaction to update those prices.
3. Submits it to the network and will print the txhash if successful.

You can run this example with `npm run example-relay`. A full command that updates BTC and LUNA prices on the testnet network looks like so:

```bash
npm run example-relay -- --network testnet --mnemonic "my good mnemonic" --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2
```

## How Pyth Works in Terra

Pyth prices are published on Solana, and relayed to Terra using the [Wormhole Network](https://wormholenetwork.com/) as a cross-chain message passing bridge. The Wormhole Network observes when Pyth prices on Solana have changed and publishes an off-chain signed message attesting to this fact. This is explained in more detail [here](https://docs.wormholenetwork.com/wormhole/).

This signed message can then be submitted to the Pyth contract on the Terra network, which will verify the Wormhole message and update the Pyth Terra contract with the new price.

### On-demand price updates

Price updates are not submitted on the Terra network automatically: rather, when a consumer needs to use the value of a price they should first submit the latest Wormhole update for that price to Terra. This will make the most recent price update available on-chain for Terra contracts to use.
