# Pyth JS

The Pyth JS repo provides utilities for consuming price feeds from the [pyth.network](https://pyth.network/) oracle in JavaScript.

Please see the [pyth.network documentation](https://docs.pyth.network/) for more information about pyth.network.

## Usage

- The [pyth-evm-js](./pyth-evm-js/) package can be used to consume Pyth price feeds on EVM-based networks.
- The [pyth-aptos-js](./pyth-aptos-js/) package can be used to consume Pyth price feeds on the Aptos networks.
- The [pyth-terra-js](./pyth-terra-js/) package can be used to consume Pyth price feeds on the Terra network.

## Development

### pre-commit hooks

We require the [pre-commit hooks](https://pre-commit.com/) defined in [`.pre-commit-config.yaml`](.pre-commit-config.yaml) to be ran on each PR before merging. To enable these to check and fix issues automatically in your local environment, install [pre-commit](https://pre-commit.com/) and run `pre-commit install` from the root of this repo.

## Releases

We use [Semantic Versioning](https://semver.org/) for our releases. In order to release a new version of any of the packages and publish it to npm, follow these steps:

1. Run `npm version <new version number> --no-git-tag-version`. This command will update the version of the package. Then push your changes to github.
2. Once your change is merged into `main`, create a release with tag `<package>-v<new version number>` like `pyth-evm-js-v1.5.2`, and a github action will automatically publish the new version of this package to npm.
