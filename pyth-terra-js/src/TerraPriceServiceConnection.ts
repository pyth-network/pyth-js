import { PriceServiceConnection, HexString } from "@pythnetwork/pyth-common-js";
import { MsgExecuteContract } from "@terra-money/terra.js"

export class TerraPriceServiceConnection extends PriceServiceConnection {
    /**
     * Create a Terra Message for updating given price feed.
     * 
     * @param priceId: id of the price feed as a Hex String without leading 0x.
     * @param pythContractAddr: Pyth contract address.
     * @param senderAddr: Sender address of the message. Sender should sign the message afterwards. 
     * @returns A Terra Message that can be included in a transaction to update the given price feed.
     */
    async getPythPriceUpdateMessage(priceId: HexString, pythContractAddr: string, senderAddr: string): Promise<MsgExecuteContract> {
        const latestVaa = await this.getLatestVaaBytes(priceId);
        return new MsgExecuteContract(
            senderAddr,
            pythContractAddr,
            {
                submit_vaa: {
                    data: latestVaa.toString("base64")
                }
            }
        )
    }
}
