import { PriceServiceConnection, HexString } from "@pythnetwork/pyth-common-js";
import { MsgExecuteContract } from "@terra-money/terra.js"

export class TerraPriceServiceConnection extends PriceServiceConnection {
    /**
     * Create Terra Messages for updating given price feeds.
     * 
     * @param priceId: List of id of the price feeds as an array of Hex Strings without leading 0x.
     * @param pythContractAddr: Pyth contract address.
     * @param senderAddr: Sender address of the message. Sender should sign the message afterwards. 
     * @returns A Terra Message that can be included in a transaction to update the given price feed.
     */
    async getPythPriceUpdateMessage(priceId: HexString[], pythContractAddr: string, senderAddr: string): Promise<MsgExecuteContract[]> {
        const latestVaas = await this.getLatestVaaBytes(priceId);
        return latestVaas.map(vaa => new MsgExecuteContract(
            senderAddr,
            pythContractAddr,
            {
                submit_vaa: {
                    data: vaa
                }
            }
        ));
    }
}
