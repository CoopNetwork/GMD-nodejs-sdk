import { IRequestJSON, Transaction } from "./transaction.js";

export class SendMoney extends Transaction {
    static readonly endpointName = "sendMoney";
    getRequestType(): string {
        return SendMoney.endpointName;
    }

    private constructor(requestJSON: ISendMoneyRequest) {
        super(requestJSON)
    }

    public static createTransaction(recipient: string, amountNQT: string, senderPublicKey: string,
        feeNQT = '100000000', deadline = 1440, message = ""): SendMoney {

        const reqJSON = {
            requestType: SendMoney.endpointName,
            recipient: recipient,
            amountNQT: amountNQT,
            publicKey: senderPublicKey,
            feeNQT: feeNQT,
            deadline: deadline,
            message: message
        }
        return new SendMoney(reqJSON);
    }
}

export interface ISendMoneyRequest extends IRequestJSON {
    amountNQT: string
}
