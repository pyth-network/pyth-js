# Pyth EVM JS

[Pyth](https://pyth.network/) provides real-time pricing data in a variety of asset classes, including cryptocurrency, equities, FX and commodities. This library allows you to use these real-time prices on EVM-based networks.

## Installation

### npm

```
$ npm install --save @pythnetwork/pyth-evm-js
```

### Yarn

```
$ yarn add @pythnetwork/pyth-evm-js
```

## Quickstart

Pyth stores prices off-chain to minimize gas fees, which allows us to offer a wider selection of products and faster update times.
See [How Pyth Works in EVM](#how-pyth-works-in-evm) for more details about this approach. In order to use Pyth prices on chain,
they must be fetched from an off-chain price service. The `EvmPriceServiceConnection` class can be used to interact with these services,
providing a way to fetch these prices directly in your code. The following example wraps an existing RPC provider and shows how to obtain
Pyth prices and submit them to the network:

```typescript
const connection = new EvmPriceServiceConnection(
  "https://prices-testnet.pyth.network"
); // See Price Service Endpoints section below for other endpoints

const priceIds = [
  // You can find the ids of prices at https://pyth.network/developers/price-feeds#binance-smart-chain-testnet
  "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
  "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
];

// `getPythLatestPriceFeeds` returns a `PriceFeed` for each price id. It contains all information about a price and has
// utility functions to get the current and exponentially-weighted moving average price, and other functionality.
const priceFeeds = connection.getPythLatestPriceFeeds(priceIds);
console.log(priceFeeds[0].getCurrentPrice()); // Price { conf: '1234', expo: -8, price: '12345678' }
console.log(priceFeeds[1].getEmaPrice()); // Exponentially-weighted moving average price

// By subscribing to the price feeds you can get their updates realtime.
connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
  console.log("Received a new price feed update!");
  console.log(priceFeed.getCurrentPrice());
});

// When using subscription, make sure to close the websocket upon termination to finish the process gracefully.
// connection.closeWebSocket();
setTimeout(() => {
  connection.closeWebSocket();
}, 60000);

// In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
// chain. `getPriceUpdateData` creates the update data which can be submitted to your contract. Then your contract should
// call the Pyth Contract with this data.
const priceUpdateData = await connection.getPriceUpdateData(priceIds);

await someContract.doSomething(someArg, otherArg, priceUpdateData);
```

`SomeContract` looks like so:

```solidity
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract SomeContract {
    IPyth pyth;

    constructor(address pythContract) {
        pyth = IPyth(pythContract);
    }

    function doSomething(uint someArg, string memory otherArg, bytes[] memory priceUpdateData) public {
        // Update the prices to be set to the latest values
        pyth.updatePriceFeeds(priceUpdateData);

        // Doing other things that uses prices
        bytes32 priceId = 0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b;
        PythStructs.Price currentPrice = pyth.getCurrentPrice(priceId);
    }
}
```

We strongly recommend reading our guide which explains [how to work with Pyth price feeds](https://docs.pyth.network/consume-data/best-practices).

### Examples

There are two examples in [examples](./src/examples/).

#### EvmPriceServiceClient

[This example](./src/examples/EvmPriceServiceClient.ts) fetches a `PriceFeed` for each given price id and prints them. It also subscribes for their updates and prints the updates as they come. You can run it with `npm run example-client`. A full command that prints BTC and ETH Price Feeds, in the testnet network, looks like so:

```bash
npm run example-client -- --endpoint https://prices-testnet.pyth.network --price-ids 0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6
```

#### EvmRelay

[This example](./src/examples/EvmRelay.ts) shows how to update prices on an EVM network. It does the following:

1. Gets update data to update given price feeds.
2. Calls the pyth contract with the update data.
3. Submits it to the network and prints the txhash if successful.

You can run this example with `npm run example-relay`. A full command that updates BTC and ETH prices on the BNB Chain testnet network looks like so:

```bash
npm run example-relay -- --network bnb_testnet --mnemonic "my good mnemonic" --endpoint https://prices-testnet.pyth.network --price-ids 0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6
```

## How Pyth Works on EVM Chains

Pyth prices are published on Solana, and relayed to EVM chains using the [Wormhole Network](https://wormholenetwork.com/) as a cross-chain message passing bridge. The Wormhole Network observes when Pyth prices on Solana have changed and publishes an off-chain signed message attesting to this fact. This is explained in more detail [here](https://docs.wormholenetwork.com/wormhole/).

This signed message can then be submitted to the Pyth contract on the EVM networks, which will verify the Wormhole message and update the Pyth contract with the new price.

### On-demand price updates

Price updates are not submitted on the EVM networks automatically: rather, when a consumer needs to use the value of a price they should first submit the latest Wormhole update for that price to the Pyth contract on the EVM network they are working on. This will make the most recent price update available on-chain for EVM contracts to use.

## Price Service Endpoints

Public endpoints for the Price Service are provided for both mainnet and testnet. These can be used regardless of which network you deploy your own contracts to as long as it is a Pyth supported network. For example, you can use the testnet Price Service whether you are deploying your contract to the BNB or Polygon testnet.

| network | url                                 |
| ------- | ----------------------------------- |
| mainnet | https://prices-mainnet.pyth.network |
| testnet | https://prices-testnet.pyth.network |
