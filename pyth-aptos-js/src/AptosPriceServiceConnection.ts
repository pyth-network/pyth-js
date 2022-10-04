import { PriceServiceConnection, HexString } from "@pythnetwork/pyth-common-js";
import { BCS } from "aptos";

export class AptosPriceServiceConnection extends PriceServiceConnection {
  /**
   * Gets price update data which then can be submitted to the Pyth contract to update the prices.
   * This will throw an axios error if there is a network problem or the price service returns a non-ok response (e.g: Invalid price ids)
   *
   * @param priceIds Array of hex-encoded price ids.
   * @returns Array of price update data, serialized such that it can be passed to the Pyth Aptos contract.
   */
  async getPriceFeedsUpdateData(priceIds: HexString[]): Promise<Uint8Array> {
    // Fetch the latest price feed update VAAs from the price service
    const latestVaas = await this.getLatestVaas(priceIds);

    // Serialize the VAAs using BCS
    const serializer = new BCS.Serializer();
    serializer.serializeU32AsUleb128(latestVaas.length);
    latestVaas.forEach(vaa =>
        serializer.serializeBytes(Buffer.from(vaa, "base64")));
    return serializer.getBytes();
  }
}
