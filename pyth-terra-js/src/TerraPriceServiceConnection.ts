import { PriceServiceConnection, HexString } from "@pythnetwork/pyth-common-js";
import { MsgExecuteContract } from "@terra-money/terra.js"

export class TerraPriceServiceConnection extends PriceServiceConnection {
    /**
     * Creates Terra Messages for updating given price feeds.
     * The messages will succeed even if the prices are updated with newer messages;
     * Hence, returned messages can be included alongside other messages in a single transaction.
     * 
     * Example usage:
     * ```typescript
     * const pythContractAddr = CONTRACT_ADDR['testnet'];
     * const pythMsgs = await connection.getPythPriceUpdateMessage(priceIds, pythContractAddr, wallet.key.accAddress);
     * const tx = await wallet.createAndSignTx({ msgs: [...pythMsgs, otherMsg, anotherMsg] });
     * ```
     * 
     * It will throw an axios error if there is a network problem or the Price Service returns non-ok result (e.g: Invalid price ids)
     * 
     * @param priceIds: Array of price feed ids as an array of Hex Strings without leading 0x.
     * @param pythContractAddr: Pyth contract address. CONTRACT_ADDR contains Pyth contract addresses in the networks that Pyth is live on.
     * @param senderAddr: Sender address of the created messages. Sender should sign and pay for the transaction that contains them. 
     * @returns Array of Terra Messages that can be included in a transaction to update the given price feeds.
     */
    async getPythPriceUpdateMessages(priceIds: HexString[], pythContractAddr: string, senderAddr: string): Promise<MsgExecuteContract[]> {
        const latestVaas = await this.getLatestVaas(priceIds);
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
