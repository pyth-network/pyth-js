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
Terra Price Service Connection provides multiple functions to use Pyth prices.

```typescript
const connection = new TerraPriceServiceConnection({ httpEndpoint: "https://website/example" });

const priceIds = [ // You can find id of the prices at https://pyth.network/developers/price-feeds/
    'f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b', // BTC/USD price id in testnet
    '6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2' // LUNA/USD price id in testnet
];

const priceFeeds = connection.getPythLatestPriceFeeds(priceIds);
console.log(priceFeeds[0].getCurrentPrice()); // Price { conf: '1234', expo: -8, price: '12345678' }
console.log(priceFeeds[1].getEmaPrice()); // Exponentially-weighted moving average price

const pythContractAddr = CONTRACT_ADDR['testnet'];
const msgs = await connection.getPythPriceUpdateMessages(priceIds, pythContractAddr, wallet.key.accAddress);
const tx = await wallet.createAndSignTx({ msgs: [...pythMsgs, otherMsg, anotherMsg] });
```

`getPythLatestPriceFeeds` returns a `PriceFeed` for each price id. It contains all information about a price and has
some utility functions to get the current and exponentially-weighted moving average price (and more).
Please note that prices are stored as string because JavaScript number is not precise enough to store the price values.

Pyth prices are stored off-chain and in order to use it in your dApp you need to update (relay) the price in the Terra network.
`getPythPriceUpdateMessages` creates messages that update the price. It can be included in the same transaction as your other messages.
. For more information about updating prices read [How Pyth Works in Terra](#how-pyth-works-in-terra).

### Examples
There are two examples in [examples](./src/examples/).

#### TerraPriceServiceClient
This example fetches a Price Feed of given price ids and prints it. You can run it with `npm run example-client`. A full command that prints BTC and LUNA Price Feeds looks like below:

```bash
npm run example-client -- --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2
```

#### TerraRelay
This example gets latest update message for given price ids. Then creates a transaction to update those prices and submits it to the network. It will print the txhash if successful. You can run it with `npm run example-relay`. A full command that updates BTC and Luna prices on the testnet network looks like below:

```bash
npm run example-relay -- --network testnet --mnemonic "my good mnemonic" --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2  
```

## How Pyth Works in Terra
Pyth prices are published on Solana, and relayed to Terra using the [Wormhole Network](https://wormholenetwork.com/) as a cross-chain message passing network. The Wormhole Network observes when Pyth prices on Solana have changed and publishes an off-chain signed message attesting to this fact. This is explained in more detail [here](https://docs.wormholenetwork.com/wormhole/).

This signed message is then relayed to the Pyth contract on Terra, which will verify the Wormhole message and update the Pyth Terra contract with the new price.

### On-demand price update (relaying)
Price updates are not relayed automatically: rather, when a consumer needs to read the value of a price they should first relay the latest Wormhole update for that price to Terra. This will make the most recent price update available on-chain for Terra contracts to use.

This library allows users to easily relay the latest Wormhole update, which it fetches from our Price Service. The Price Service caches the latest Wormhole update for each price, so that on-demand relayers can easily retrieve it.
