import { HexString, PriceFeed } from "@pythnetwork/pyth-sdk-js";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

export type DurationInMs = number;

export type PriceServiceConnectionConfig = {
  /* HTTP Endpoint of the price service. Example: https://website/example */
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
   * It will throw an axios error if there is a network problem or the Price Service returns non-ok result (e.g: Invalid price ids)
   *
   * @param priceIds Array of price feed ids as an array of Hex Strings without leading 0x.
   * @returns Array of Price Feeds
   */
  async getLatestPriceFeeds(
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
   * It will throw an axios error if there is a network problem or the Price Service returns non-ok result (e.g: Invalid price ids)
   * 
   * This function is coupled to wormhole implemntation and chain specific libraries use
   * it to expose on-demand relaying functionality. Hence, this is not be exposed as a public
   * api to the users and is annotated as protected.
   *
   * @param priceIds Array of price feed ids as an array of Hex Strings without leading 0x.
   * @returns Array of base64 encoded VAAs.
   */
  protected async getLatestVaas(priceIds: HexString[]): Promise<string[]> {
    const response = await this.client.get("/latest_vaa_bytes", {
      params: {
        id: priceIds,
      },
    });
    return response.data;
  }
}
