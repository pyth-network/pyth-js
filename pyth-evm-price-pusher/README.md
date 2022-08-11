# Pyth EVM price pusher

Pyth EVM price pusher is a service that regularly pushes updates to the on-chain Pyth price based on configurable conditions.

## Background

Pyth is a cross-chain oracle that streams price updates over the peer-to-peer [Wormhole Network](https://wormholenetwork.com/).
These price updates can be consumed on any chain that has a deployment of the Pyth contract.
By default, Pyth does not automatically update the on-chain price every time the off-chain price changes;
instead, anyone can permissionlessly update the on-chain price prior to using it.
For more information please refer to [this document](../pyth-evm-js/README.md#how-pyth-works-on-evm-chains).

Protocols integrating with can update the on-chain Pyth prices in two different ways.
The first approach is on-demand updates: package a Pyth price update together with each transaction that depends on it.
On-demand updates minimize latency and are more gas efficient, as prices are only updated on-chain when they are needed.

The second approach is to run this service to regularly push updates to the on-chain price.
This approach is useful for protocols that already depend on regular push updates.

## Running Price Pusher

The price pusher service monitors both the off-chain and on-chain Pyth price for a configured set of price feeds.
It then pushes a price update to an on-chain Pyth contract if any of the following conditions are met:

- Time difference: The on-chain price is older than `time-difference` seconds
  from the latest Pyth price.
- Price deviation: The latest Pyth price feed has changed more than `price-deviation` percent
  from the on-chain price feed price.
- Confidence ratio: The latest Pyth price feed has confidence to price ratio of more than
  `confidence-ratio`.

To run the price pusher, please run the following commands, replacing the command line arguments as necessary:

```sh
npm install # Only run it the first time

npm run start -- --evm-endpoint wss://example-rpc.com --mnemonic-file "path/to/mnemonic.txt" \
    --pyth-contract example_network --price-endpoint https://example-pyth-price.com \
    --time-difference 60 --price-deviation 0.5 --confidence-ratio 5 \
    --price-ids "abcd..." "efgh..." "..." \
    [--cooldown-duration 10] \
    [--evm-polling-frequency 5]
```

### Command Line Arguments

The program accepts the following command line arguments:

- `evm-endpoint`: RPC endpoint URL for the EVM network. If you provide a websocket RPC endpoint (`ws[s]://...`),
  the price pusher will use event subscriptions to read the current EVM price. If you provide a normal
  HTTP endpoint, the pusher will periodically poll for updates. The polling interval is configurable via
  the `evm-polling-frequency` command-line argument (described below).
- `mnemonic-file`: Payer mnemonic (private key) file.
- `pyth-contract`: The Pyth contract address. Provide the network name on which Pyth is deployed
  or the Pyth contract address if you use a local network.
  You can find the networks on which pyth is live and their corresponding names
  [here](../pyth-evm-js/src/index.ts#L13). An example is `bnb_testnet`.
- `price-endpoint`: Endpoint URL for the price service. You can use
  `https://prices.testnet.pyth.network` for testnet and
  `https://prices.mainnet.pyth.network` for mainnet. It is recommended
  to run a standalone price service for more resiliency.
- `price-ids`: Space separated price feed ids (in hex) to push. List of available
  price feeds is available in the [price feed ids page][].
- `time-difference`: Time difference threshold (in seconds) to push a newer price feed.
- `price-deviation`: The price deviation (%) threshold to push a newer price feed.
- `confidence-ratio`: The confidence/price (%) threshold to push a newer price feed.
- `cooldown-duration` (Optional): The amount of time (in seconds) to wait between pushing
  price updates. It should be greater than the block time of the network, so this
  program confirms the price is updated and does not push it twice. Default: 10 seconds.
- `evm-polling-frequency` (Optional): The frequency to poll price info data from the EVM network
  if the RPC is not a Websocket. It has no effect if the RPC is a Websocket.
  Default: 5 seconds.

[price feed ids page]: https://pyth.network/developers/price-feed-ids/#pyth-cross-chain-testnet

### Example

For example, to push `BTC/USD` and `BNB/USD` prices on BNB testnet, run the following command:

```sh
npm run start -- --evm-endpoint "https://data-seed-prebsc-1-s1.binance.org:8545" --mnemonic-file "path/to/mnemonic.txt" \
  --pyth-contract bnb_testnet --price-endpoint https://prices.testnet.pyth.network \
  --price-ids "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b" "ecf553770d9b10965f8fb64771e93f5690a182edc32be4a3236e0caaa6e0581a" \
  --time-difference 60 --price-deviation 0.5 --confidence-ratio 1
```
