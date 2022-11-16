import Web3 from "web3";
import { isWsEndpoint } from "./utils";

export function createWeb3Provider(endpoint: string) {
  if (isWsEndpoint(endpoint)) {
    Web3.providers.WebsocketProvider.prototype.sendAsync =
      Web3.providers.WebsocketProvider.prototype.send;
    return new Web3.providers.WebsocketProvider(endpoint, {
      clientConfig: {
        keepalive: true,
        keepaliveInterval: 30000,
      },
      reconnect: {
        auto: true,
        delay: 1000,
        onTimeout: true,
      },
      timeout: 30000,
    });
  } else {
    Web3.providers.HttpProvider.prototype.sendAsync =
      Web3.providers.HttpProvider.prototype.send;
    return new Web3.providers.HttpProvider(endpoint, {
      keepAlive: true,
      timeout: 30000,
    });
  }
}
