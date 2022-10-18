# Pyth Aptos JS

[Pyth](https://pyth.network/) provides real-time pricing data in a variety of asset classes, including cryptocurrency, equities, FX and commodities. This library allows you to use these real-time prices on Aptos networks.

## Installation

### npm

```
$ npm install --save @pythnetwork/pyth-aptos-js
```

### Yarn

```
$ yarn add @pythnetwork/pyth-aptos-js
```

## Quickstart

Pyth stores prices off-chain to minimize gas fees, which allows us to offer a wider selection of products and faster update times.
To use Pyth prices on chain,
they must be fetched from an off-chain price service. The `AptosPriceServiceConnection` class can be used to interact with these services,
providing a way to fetch these prices directly in your code. The following example wraps an existing RPC provider and shows how to obtain
Pyth prices and submit them to the network:

```typescript
const connection = new AptosPriceServiceConnection(
  "https://xc-testnet.pyth.network"
); // See Price Service endpoints section below for other endpoints

const priceIds = [
  // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#aptos-testnet
  "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
  "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
];

// In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
// chain. `getPriceUpdateData` creates the update data which can be submitted to your contract. Then your contract should
// call the Pyth Contract with this data.
const priceUpdateData = await connection.getPriceUpdateData(priceIds);

// Create a transaction and submit to your contract using the price update data
const client = new AptosClient(endpoint);
let result = await client.generateSignSubmitWaitForTransaction(
  sender,
  new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      "0x..::your_module",
      "do_something",
      [],
      [priceUpdateData]
    )
  )
);
```

`your_module::do_something` should then call `pyth::update_price_feeds` before querying the data using `pyth::get_price`:

```move
module example::your_module {
    use pyth::pyth;
    use pyth::price_identifier;
    use aptos_framework::coin;

    public fun do_something(user: &signer, pyth_update_data: vector<vector<u8>>) {

        // First update the Pyth price feeds
        let coins = coin::withdraw(user, pyth::get_update_fee());
        pyth::update_price_feeds(pyth_update_data, coins);

        // Now we can use the prices which we have just updated
        let btc_usd_price_id = price_identifier::from_byte_vec(
            x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43");
        let price = pyth::get_price(btc_usd_price_id);

    }
}
```

We strongly recommend reading our guide which explains [how to work with Pyth price feeds](https://docs.pyth.network/consume-data/best-practices).

### Off-chain prices

Many applications additionally need to display Pyth prices off-chain, for example, in their frontend application.
The `AptosPriceServiceConnection` provides two different ways to fetch the current Pyth price.
The code blocks below assume that the `connection` and `priceIds` objects have been initialized as shown above.
The first method is a single shot query:

```typescript
// `getLatestPriceFeeds` returns a `PriceFeed` for each price id. It contains all information about a price and has
// utility functions to get the current and exponentially-weighted moving average price, and other functionality.
const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
// Get the price if it is not older than 60 seconds from the current time.
console.log(priceFeeds[0].getPriceNoOlderThan(60)); // Price { conf: '1234', expo: -8, price: '12345678' }
// Get the exponentially-weighted moving average price if it is not older than 60 seconds from the current time.
console.log(priceFeeds[1].getEmaPriceNoOlderThan(60));
```

The object also supports a streaming websocket connection that allows you to subscribe to every new price update for a given feed.
This method is useful if you want to show continuously updating real-time prices in your frontend:

```typescript
// Subscribe to the price feeds given by `priceId`. The callback will be invoked every time the requested feed
// gets a price update.
connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
  console.log("Received a new price feed update!");
  console.log(priceFeed.getPriceNoOlderThan(60));
});
```


### Example

[This example](./src/examples/AptosRelay.ts) shows how to update prices on an Aptos network. It does the following:

1. Fetches update data from the Price Service for the given price feeds.
2. Calls the Pyth Aptos contract with the update data.

You can run this example with `npm run example-relay`. A full command that updates BTC and ETH prices on the BNB Chain testnet network looks like this:

```bash
export APTOS_KEY = "0x...";
npm run example-relay -- --endpoint https://xc-testnet.pyth.network --price-ids 0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6 --full-node https://fullnode.testnet.aptoslabs.com/v1 --pyth-contract 0xaa706d631cde8c634fe1876b0c93e4dec69d0c6ccac30a734e9e257042e81541
```

## How Pyth Works on Aptos

Pyth prices are published on Pythnet, and relayed to Aptos using the [Wormhole Network](https://wormholenetwork.com/) as a cross-chain message passing bridge. The Wormhole Network observes when Pyth prices on Pythnet have changed and publishes an off-chain signed message attesting to this fact. This is explained in more detail [here](https://docs.wormholenetwork.com/wormhole/).

This signed message can then be submitted to the Pyth contract on the Aptos networks, which will verify the Wormhole message and update the Pyth contract with the new price.

### On-demand price updates

Price updates are not submitted to the Aptos networks automatically: rather, when a consumer needs to use the value of a price they should first submit the latest Wormhole update for that price to the Pyth contract on the Aptos network they are working on. This will make the most recent price update available on-chain for Aptos contracts to use.

## Price Service endpoints

We provide a public endpoint for the Price Service for Testnet, and will provide one for Mainnet on launch day.

| Aptos Network | Price Service URL               |
| ------------- | ------------------------------- |
| Testnet       | https://xc-testnet.pyth.network |
