import { CryptoUtil } from "../crypto-util.js";
import { IRequestJSON, Transaction } from "./transaction.js";

export class SendMoney extends Transaction {
    static readonly endpointName = "sendMoney";
    getRequestType(): string {
        return SendMoney.endpointName;
    }

    private constructor(requestJSON: ISendMoneyRequest) {
        super(requestJSON)
    }

    public static createTransaction(recipient: string, amountGMD: string, senderPublicKey: string,
        feeGMD = '1', deadline = 1440, message = ""): SendMoney {

        const reqJSON = {
            requestType: SendMoney.endpointName,
            recipient: recipient,
            amountNQT: CryptoUtil.Crypto.GmdToNqt(amountGMD),
            publicKey: senderPublicKey,
            feeNQT: CryptoUtil.Crypto.GmdToNqt(feeGMD),
            deadline: deadline,
            message: message
        }
        return new SendMoney(reqJSON);
    }
}

export interface ISendMoneyRequest extends IRequestJSON {
    amountNQT: string
}
