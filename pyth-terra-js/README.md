# Pyth Terra JS
This library provide utilities to interact with Pyth Oracle on the Terra network.

## How Pyth Works in Terra
Pyth oracle is currently implemented in Solana network. Solana is a very fast blockchain that enabled us
to have price updates under 1 seconds. In order to move prices cross chains we are using
[Wormhole Network](https://wormholenetwork.com/) as a cross chain message passing layer.
In nutshell Wormhole creates some verified messages from Pyth Prices that by can be validated in
each chain that they support. By sending the messages to Pyth Contract on Terra we can make sure
that we received a correct price and update it in our contract.

### On-demand price update
To enable faster price updates and scaling available price feeds, we have changed the way that we deliver prices in Terra.
Instead of updating prices regularly in Terra (e.g: every 60 seconds) we are moving to a new model called "On-demand Price Update".

In this model, users ,that are using Pyth prices, will update the prices they need in the same transaction that uses them. By this prices will be updated with much less delay if there is a need to use them and if a price is in high demand it could potentially be updated every block by the users. This also enables us to scale number of available prices because there won't be any cost of updating them if there is no demand for it.

To acheive it We have created a Price Service that serves prices that wormhole has verified them. Your protocol instead of reading the price from the Pyth Terra contract reads price from this service and when needs to make a transaction based on that price it will include Pyth price update messages in that transaction. This library provides a simple interface to interact with the price service.

## How to use Pyth Terra JS
This library has a `TerraPriceServiceConnection` class which can be instantiated with the Price Service URI like below:
```typescript
const connection = new TerraPriceServiceConnection({ httpEndpoint: "https://website/example" });
```

### Get Latest Price Feeds
You need to call the connection `getPythPriceUpdateMessages` method with a list of price ids like below:
```typescript
const priceFeeds: PriceFeed[] = await connection.getLatestPriceFeeds(["fedcba987...", "01234..."]);
```
If successful, it returns an array of Price Feeds. In case of network error or a non-ok response from the price service (e.g: Invalid price ids) it will throw an axios error.

### Get Pyth Price Update Messages
You need to call the connection `getPythPriceUpdateMessages` method with a list of price ids alongside Pyth contract address and sender address. It should look like below:

```typescript
const pythContractAddr = CONTRACT_ADDR['testnet']
const msgs = await connection.getPythPriceUpdateMessages(priceIds, pythContractAddr, wallet.key.accAddress);
```

If successful, it returns an array of Terra messages. In case of network error or a non-ok response from the price service (e.g: Invalid price ids) it will throw an axios error.

You should include the returned messages in the beginning of your transaction like below:
```typescript
const tx = await wallet.createAndSignTx({ msgs: [...pythMsgs, otherMsg, anotherMsg] });
```

### Examples
There are two examples in [examples](./src/examples/).

#### TerraPriceServiceClient
This example fetches a Price Feed of given price ids and prints it. You can run it with `npm run example-client`. A full command that prints BTC and LUNA price feeds looks like below:

```bash
npm run example-client -- --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2
```

#### TerraRelay
This example gets latest update message for given price ids. Then creates a transaction to update those prices and submits it to the network. It will print the txhash if successful. You can run it with `npm run example-relay`. A full command that updates BTC and Luna prices on the testnet network looks like below:

```bash
npm run example-relay -- --network testnet --mnemonic "my good mnemonic" --http https://website/example --price-ids f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b 6de025a4cf28124f8ea6cb8085f860096dbc36d9c40002e221fc449337e065b2  
```
