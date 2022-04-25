import { HexString, PriceFeed } from "@pythnetwork/pyth-sdk-js";
import axios, { AxiosInstance } from "axios";
import axiosRetry from 'axios-retry';


export type DurationInMs = number;

export type PriceServiceConnectionConfig = {
  endpoint: string,
  /* Timeout of each request (for all of retries). Default: 5000ms */
  timeout?: DurationInMs,
  /**
   * Number of retrials if it's failing to get price. Default: 3.
   * 
   * Connection uses exponential back-off for the delay between retrials
   * and will timeout regardless with the configured `timeout`.
   */
  retries?: number,
}

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

  async getLatestPriceFeeds(priceIds: HexString[]): Promise<PriceFeed[] | undefined> {
    if (priceIds.length === 0) {
      return [];
    }

    let response = await this.client.get(`/latest_price_feed?id[]=${priceIds.join("&id[]=")}`);
    let priceFeedsJson = response.data as any[];
    return priceFeedsJson.map(priceFeedJson => PriceFeed.fromJson(priceFeedJson));
  }

  async getLatestVaaBytes(priceId: HexString): Promise<string> {
    let response = await this.client.get(`/latest_vaa_bytes?id=${priceId}`);
    return response.data;
  }
}
