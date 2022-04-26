import { HexString, PriceFeed } from "@pythnetwork/pyth-sdk-js";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

export type DurationInMs = number;

export type PriceServiceConnectionConfig = {
  endpoint: string;
  /* Timeout of each request (for all of retries). Default: 5000ms */
  timeout?: DurationInMs;
  /**
   * Number of times a request will be retried before the API returns a failure. Default: 3.
   *
   * The connection uses exponential back-off for the delay between retries. However,
   * it will timeout regardless of the retries at the configured `timeout` time.
   */
  retries?: number;
};

export class PriceServiceConnection {
  private client: AxiosInstance;

  constructor(config: PriceServiceConnectionConfig) {
    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 5000,
    });
    axiosRetry(this.client, {
      retries: config.retries || 3,
      retryDelay: axiosRetry.exponentialDelay,
    });
  }

  async getLatestPriceFeeds(
    priceIds: HexString[]
  ): Promise<PriceFeed[] | undefined> {
    if (priceIds.length === 0) {
      return [];
    }

    let response = await this.client.get(
      '/latest_price_feed',
      {
        params: {
          id: priceIds,
        }
      }
    );
    let priceFeedsJson = response.data as any[];
    return priceFeedsJson.map((priceFeedJson) =>
      PriceFeed.fromJson(priceFeedJson)
    );
  }

  async getLatestVaaBytes(priceId: HexString): Promise<string> {
    let response = await this.client.get(
      '/latest_vaa_bytes',
      {
        params: {
          id: priceId,
        }
      }
    );
    return response.data;
  }
}
