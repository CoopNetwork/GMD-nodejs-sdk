import { CryptoUtil } from './crypto-util';
import { Transaction, TransactionState } from './transactions/transaction';
import Converters = CryptoUtil.Converters;

export class Signer {
    publicKey: string;
    protected privateKey: string;
    constructor(publicKey: string, privKey: string) {
        this.publicKey = publicKey;
        this.privateKey = privKey;
    }

    async signTransactionBytes(unsignedTransactionHex: string): Promise<string> {
        const sig = await CryptoUtil.Crypto.signHex(unsignedTransactionHex, this.privateKey);
        return unsignedTransactionHex.slice(0, 192) + sig + unsignedTransactionHex.slice(320);
    }

    async signTransaction(transaction: Transaction) {
        if (transaction.state === TransactionState.UNSIGNED && transaction.unsignedTransactionBytes && Converters.isHex(transaction.unsignedTransactionBytes)) {
            const signedTransactionBytes = await this.signTransactionBytes(transaction.unsignedTransactionBytes);
            transaction.onSigned(signedTransactionBytes);
        }
    }

    signHex(hexMessage: string): Promise<string> {
        return CryptoUtil.Crypto.signHex(hexMessage, this.privateKey);
    }

    signStr(message: string): Promise<string> {
        return this.signHex(Converters.strToHex(message));
    }

    static verifySignatureHex(signature: string, unsignedHexMessage: string, publicKey: string): Promise<boolean> {
        return CryptoUtil.Crypto.verifySignature(signature, unsignedHexMessage, publicKey);
    }

    static verifySignatureStr(signature: string, unsignedStrMessage: string, publicKey: string): Promise<boolean> {
        return this.verifySignatureHex(signature, Converters.strToHex(unsignedStrMessage), publicKey);
    }
}