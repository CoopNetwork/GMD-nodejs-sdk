import { CryptoUtil } from "./crypto-util";
import { Provider } from "./provider";
import { SendMoney } from "./transactions/send-money";

export class WalletPublic {
    publicKey: string | undefined;
    provider: Provider | null;
    accountRS: string;

    protected constructor(publicKey: string | undefined, accountRS: string, provider: Provider|null = null) {
        this.publicKey = publicKey;
        this.provider = provider;
        this.accountRS = accountRS;
    } 

    connect(provider: Provider) {
        const wallet = new WalletPublic(this.publicKey, this.accountRS, provider);
        wallet.provider = provider;
        return wallet;
    }

    async getBalance(): Promise<string> {
        this.checkProvider();
        return (this.provider as Provider).getBalance(this.accountRS);
    }

    protected checkProvider() {
        if (!this.provider) {
            throw new Error('Wallet operation requires a Provider to be connected');
        }
    }

    static verifySignatureHex(signature: string, unsignedHexMessage: string, publicKey: string): Promise<boolean> {
        return CryptoUtil.Crypto.verifySignature(signature, unsignedHexMessage, publicKey);
    }

    static verifySignatureStr(signature: string, unsignedStrMessage: string, publicKey: string): Promise<boolean> {
        return this.verifySignatureHex(signature, CryptoUtil.Converters.strToHex(unsignedStrMessage), publicKey);
    }

    async createUnsignedSendGMDTransaction(to: string, amountGMD: string) {
        this.checkProvider();
        if( !this.publicKey ) {
            throw new Error('Public key is required');
        }
        const transaction = SendMoney.createTransaction(to, amountGMD, this.publicKey);
        await transaction.createUnsignedTransaction(this.provider as Provider);
        return transaction;
    }

    async getTransactions<T>(outbound: boolean, pageSize: number, page: number) : Promise<Array<T> | undefined>  {
        this.checkProvider();
        return this.provider?.getTransactions<T>(outbound, this.accountRS, pageSize, page);
    }
}
