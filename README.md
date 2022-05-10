# Pyth JS

The Pyth JS repo provides utilities for consuming price feeds from the [pyth.network](https://pyth.network/) oracle in JavaScript.

Please see the [pyth.network documentation](https://docs.pyth.network/) for more information about pyth.network.

## Usage

The [pyth-terra-js](./pyth-terra-js/) package can be used to consume Pyth price feeds on the Terra network. Other networks are coming soon!

## Development

### pre-commit hooks

pre-commit is a tool that checks and fixes simple issues (formatting, ...) before each commit. You can install it by following [their website](https://pre-commit.com/). In order to enable checks for this repo run `pre-commit install` from command-line in the root of this repo.

The checks are also performed in the CI to ensure the code follows consistent formatting.
