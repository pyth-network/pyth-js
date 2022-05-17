# Pyth JS

The Pyth JS repo provides utilities for consuming price feeds from the [pyth.network](https://pyth.network/) oracle in JavaScript.

Please see the [pyth.network documentation](https://docs.pyth.network/) for more information about pyth.network.

## Usage

- The [pyth-evm-js](./pyth-evm-js/) package can be used to consume Pyth price feeds on EVM-based networks.
- The [pyth-terra-js](./pyth-terra-js/) package can be used to consume Pyth price feeds on the Terra network.

## Development

### pre-commit hooks

We require the [pre-commit hooks](https://pre-commit.com/) defined in [`.pre-commit-config.yaml`](.pre-commit-config.yaml) to be ran on each PR before merging. To enable these to check and fix issues automatically in your local environment, install [pre-commit](https://pre-commit.com/) and run `pre-commit install` from the root of this repo.
