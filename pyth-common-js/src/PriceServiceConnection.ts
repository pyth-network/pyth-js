import { HexString, PriceFeed } from "@pythnetwork/pyth-sdk-js";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

export type DurationInMs = number;

export type PriceServiceConnectionConfig = {
  httpEndpoint: string;
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
      baseURL: config.httpEndpoint,
      timeout: config.timeout || 5000,
    });
    axiosRetry(this.client, {
      retries: config.retries || 3,
      retryDelay: axiosRetry.exponentialDelay,
    });
  }

  /**
   * Fetch Latest Price Feeds of given Price Ids.
   *
   * @param priceIds
   * @returns array of Price Feeds
   */
  async getLatestPriceFeed(
    priceIds: HexString[]
  ): Promise<PriceFeed[] | undefined> {
    if (priceIds.length === 0) {
      return [];
    }

    const response = await this.client.get("/latest_price_feed", {
      params: {
        id: priceIds,
      },
    });
    const priceFeedsJson = response.data as any[];
    return priceFeedsJson.map((priceFeedJson) =>
      PriceFeed.fromJson(priceFeedJson)
    );
  }

  /**
   * Fetch latest VAA of a price Id as a byte string from the api.
   *
   * This function is coupled to wormhole implemntation and chain specific libraries use
   * it to expose on-demand relaying functionality. This should not be exposed as a public
   * api to the users, so it's annotated protected.
   *
   * @param priceId as a Hex String
   * @returns byte string of vaa
   */
  protected async getLatestVaaBytes(priceId: HexString): Promise<Buffer> {
    const response = await this.client.get("/latest_vaa_bytes", {
      responseType: "arraybuffer",
      params: {
        id: priceId,
      },
    });
    return response.data;
  }
}
