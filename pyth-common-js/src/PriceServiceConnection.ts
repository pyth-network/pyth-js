import { HexString, PriceFeed } from "@pythnetwork/pyth-sdk-js";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import * as WebSocket from "isomorphic-ws";
import { Logger } from "ts-log";
import { ResilientWebSocket } from "./ResillientWebSocket";

export type DurationInMs = number;

export type PriceServiceConnectionConfig = {
  /* HTTP Endpoint of the price service. Example: https://website/example */
  httpEndpoint: string;
  /* WebSocket Endpoint of the price service. Example: wss://website/example */
  wsEndpoint?: string;
  /* Timeout of each request (for all of retries). Default: 5000ms */
  timeout?: DurationInMs;
  /**
   * Number of times a HTTP request will be retried before the API returns a failure. Default: 3.
   *
   * The connection uses exponential back-off for the delay between retries. However,
   * it will timeout regardless of the retries at the configured `timeout` time.
   */
  httpRetries?: number;
  /* Optional logger (e.g: console or any logging library) to log internal events */
  logger?: Logger;
};

type ClientMessage = {
  type: "subscribe" | "unsubscribe";
  ids: HexString[];
};

type ServerResponse = {
  type: "response";
  status: "success" | "error";
  error?: string;
};

type ServerPriceUpdate = {
  type: "price_update";
  price_feed: any;
};

type ServerMessage = ServerResponse | ServerPriceUpdate;

export type PriceFeedUpdateCallback = (priceFeed: PriceFeed) => any;

export class PriceServiceConnection {
  private httpClient: AxiosInstance;

  private priceFeedCallbacks: Map<HexString, Set<PriceFeedUpdateCallback>>;
  private wsClient: undefined | ResilientWebSocket;
  private wsEndpoint: undefined | string;

  /**
   * Custom handler for web socket errors (connection and message parsing).
   *
   * Default handler only logs the errors.
   */
  onWsError: (error: Error) => any;

  private logger: undefined | Logger;

  constructor(config: PriceServiceConnectionConfig) {
    this.httpClient = axios.create({
      baseURL: config.httpEndpoint,
      timeout: config.timeout || 5000,
    });
    axiosRetry(this.httpClient, {
      retries: config.httpRetries || 3,
      retryDelay: axiosRetry.exponentialDelay,
    });

    this.priceFeedCallbacks = new Map();
    this.logger = config.logger;
    this.onWsError = (error: Error) => {
      this.logger?.error(error);
    };

    this.wsEndpoint = config.wsEndpoint;
  }

  /**
   * Fetch Latest PriceFeeds of given price ids.
   * This will throw an axios error if there is a network problem or the price service returns a non-ok response (e.g: Invalid price ids)
   *
   * @param priceIds Array of hex-encoded price ids.
   * @returns Array of PriceFeeds
   */
  async getLatestPriceFeeds(
    priceIds: HexString[]
  ): Promise<PriceFeed[] | undefined> {
    if (priceIds.length === 0) {
      return [];
    }

    const response = await this.httpClient.get("/latest_price_feeds", {
      params: {
        ids: priceIds,
      },
    });
    const priceFeedsJson = response.data as any[];
    return priceFeedsJson.map((priceFeedJson) =>
      PriceFeed.fromJson(priceFeedJson)
    );
  }

  /**
   * Fetch latest VAA of given price ids.
   * This will throw an axios error if there is a network problem or the price service returns a non-ok response (e.g: Invalid price ids)
   *
   * This function is coupled to wormhole implemntation and chain specific libraries use
   * it to expose on-demand relaying functionality. Hence, this is not be exposed as a public
   * api to the users and is annotated as protected.
   *
   * @param priceIds Array of hex-encoded price ids.
   * @returns Array of base64 encoded VAAs.
   */
  protected async getLatestVaas(priceIds: HexString[]): Promise<string[]> {
    const response = await this.httpClient.get("/latest_vaas", {
      params: {
        ids: priceIds,
      },
    });
    return response.data;
  }

  async subscribePriceFeedUpdate(
    priceIds: HexString[],
    cb: PriceFeedUpdateCallback
  ) {
    if (this.wsClient === undefined) {
      throw new Error("WS is not started.");
    }

    const newPriceIds: HexString[] = [];

    for (const id of priceIds) {
      if (!this.priceFeedCallbacks.has(id)) {
        this.priceFeedCallbacks.set(id, new Set());
        newPriceIds.push(id);
      }

      this.priceFeedCallbacks.get(id)!.add(cb);
    }

    const message: ClientMessage = {
      ids: newPriceIds,
      type: "subscribe",
    };

    await this.wsClient?.send(JSON.stringify(message));
  }

  async unsubscribePriceFeedUpdate(
    priceIds: HexString[],
    cb?: PriceFeedUpdateCallback
  ) {
    if (this.wsClient === undefined) {
      throw new Error("WS is not started.");
    }

    const removedPriceIds: HexString[] = [];

    for (const id of priceIds) {
      if (this.priceFeedCallbacks.has(id)) {
        let idRemoved = false;

        if (cb === undefined) {
          this.priceFeedCallbacks.delete(id);
          idRemoved = true;
        } else {
          this.priceFeedCallbacks.get(id)!.delete(cb);

          if (this.priceFeedCallbacks.get(id)!.size === 0) {
            this.priceFeedCallbacks.delete(id);
            idRemoved = true;
          }
        }

        if (idRemoved) {
          removedPriceIds.push(id);
        }
      }
    }

    const message: ClientMessage = {
      ids: removedPriceIds,
      type: "unsubscribe",
    };

    this.wsClient?.send(JSON.stringify(message));
  }

  async startWebSocket() {
    if (this.wsEndpoint === undefined) {
      throw new Error("WS Endpoint is undefined.");
    }

    this.wsClient = new ResilientWebSocket(this.wsEndpoint, this.logger);

    this.wsClient.onError = this.onWsError;

    this.wsClient.onReconnect = () => {
      if (this.priceFeedCallbacks.size > 0) {
        const message: ClientMessage = {
          ids: Array.from(this.priceFeedCallbacks.keys()),
          type: "subscribe",
        };

        this.logger?.info("Subscribing existing price feeds");
        this.wsClient?.send(JSON.stringify(message));
      }
    };

    this.wsClient.onMessage = (data: WebSocket.Data) => {
      this.logger?.info(`Received message ${data.toString()}`);

      let message: ServerMessage;

      try {
        message = JSON.parse(data.toString()) as ServerMessage;
      } catch (e: any) {
        this.logger?.error(`Error parsing message ${data.toString()} as JSON.`);
        this.logger?.error(e);
        this.onWsError(e);
        return;
      }

      if (message.type === "response") {
        if (message.status === "error") {
          this.logger?.error(`Error Response from WS server`);
          this.onWsError(new Error(message.error));
        }
      } else if (message.type === "price_update") {
        let priceFeed;
        try {
          priceFeed = PriceFeed.fromJson(message.price_feed);
        } catch (e: any) {
          this.logger?.error(
            `Error parsing Price Feeds from message ${data.toString()}`
          );
          this.logger?.error(e);
          this.onWsError(e);
          return;
        }

        if (!this.priceFeedCallbacks.has(priceFeed.id)) {
          this.logger?.info(
            `No callback for price id ${priceFeed.id}. It should only happen in a race condition`
          );
        } else {
          for (const cb of this.priceFeedCallbacks.get(priceFeed.id)!) {
            cb(priceFeed);
          }
        }
      } else {
        this.logger?.warn(
          `Received unsupported message ${data.toString()}. Ignoring it`
        );
      }
    };

    await this.wsClient.startWebSocket();
  }

  stopWebSocket() {
    if (this.wsClient === undefined) {
      throw new Error("WS Endpoint is not given hence Websocket is disabled.");
    }
    this.wsClient?.closeWebSocket();
    this.wsClient = undefined;
    this.priceFeedCallbacks.clear();
  }
}
