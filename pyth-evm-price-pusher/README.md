# EVM Pyth price pusher

Pyth prices are not pushed to the EVM networks automatically. It is recommended to use the Pyth on-demand update
model, in which protocol users update the price within their transaction that uses the price. It will allow access
to a low latency and more accurate price and is more efficient than updating the price regularly.
For more information please refer to [this document](../pyth-evm-js/README.md#how-pyth-works-on-evm-chains).

EVM Pyth price pusher is a service that regularly pushes prices on an EVM network based on configurable conditions.
The purpose of this service is solely to make initial integration with Pyth easier, and Pyth will not run this service.

This service updates the prices in EVM networks if any
of the following conditions are met:

- Time difference: The on-chain price feed is older than `time-difference` seconds
  from the latest Pyth price feed.
- Price deviation: The latest Pyth price feed has changed more than `price-deviation` percent
  from the on-chain price feed price.
- Confidence ratio: The latest Pyth price feed has confidence to price ratio of more than
  `confidence-ratio`.

To run it, please run the following commands:

```sh
npm install # only run it the first time

npm run start -- --evn-network wss://example-rpc.com --mnemonic-file "path/to/mnemonic.txt" \
    --pyth-contract example_network --price-endpoint https://example-pyth-price.com \
    --time-difference 60 --price-deviation 0.5 --confidence-ratio 5 \
    --price-ids "abcd..." "efgh..." "..." \
    [--cooldown-duration 10] \
    [--evm-polling-frequency 10]
```

Program arguments:

- `evm-network`: RPC of the target EVM network. Use `ws[s]://` for a Websocket RPC endpoint
  if you intent to use subscription instead of polling.
- `mnemonic-file`: Payer mnemonic (private key) file.
- `pyth-contract`: Pyth contract address. Provide the network name on which Pyth is deployed
  or the Pyth contract address if you use a local network.
  You can find the networks on which pyth is live and their corresponding names
  [here](../pyth-evm-js/src/index.ts#L13). An example is `bnb_testnet`.
- `price-endpoint`: Endpoint URL for the price service. You can use
  `https://prices.testnet.pyth.network` for testnet and
  `https://prices.mainnet.pyth.network` for mainnet. It is recommended
  to run a standalone price service for more resiliency.
- `price-ids`: Space separated price feed ids (in hex) to push. List of available
  price feeds is available in the [price feed ids page][]
- `time-difference`, `price-deviation`, `confidence-ratio`: Pushing conditions
  that are described above.
- `cooldown-duration` (Optional): The amount of time (in seconds) to wait between pushing
  price updates. It should be greater than the block time of the network, so this
  program confirms it is updated and does not push it twice. Default: 10 seconds.
- `evm-polling-frequency` (Optional): The frequency to poll price info data from the EVM network
  if the RPC is not a Websocket. It has no effect if the RPC is a Websocket.
  Default: 5 seconds.

[price feed ids page]: https://pyth.network/developers/price-feed-ids/#pyth-cross-chain-testnet

An example command updating `BTC/USD` and `BNB/USD` prices on BNB testnet looks like so:

```sh
npm run start -- --evm-network "https://data-seed-prebsc-1-s1.binance.org:8545" --mnemonic-file "path/to/mnemonic.txt" \
  --pyth-contract bnb_testnet --price-endpoint https://prices.testnet.pyth.network \
  --price-ids "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b" "ecf553770d9b10965f8fb64771e93f5690a182edc32be4a3236e0caaa6e0581a" \ --time-difference 60 --price-deviation 0.5 --confidence-ratio 1
```
