import { CryptoUtil } from './crypto-util.js';
import KeyEncryption from './key-encryption.js';
import { Provider } from './provider.js';
import { WalletPublic } from './wallet-public.js';
import Converters = CryptoUtil.Converters;

export class Signer extends WalletPublic{
    protected privateKey: string;
    protected constructor(publicKey: string, privateKey: string, accountRS:string, provider: Provider | null = null) {
        super(publicKey, accountRS, provider);
        this.privateKey = privateKey;
    }

    async signTransactionBytes(unsignedTransactionHex: string): Promise<string> {
        const sig = await CryptoUtil.Crypto.signHex(unsignedTransactionHex, this.privateKey);
        return unsignedTransactionHex.slice(0, 192) + sig + unsignedTransactionHex.slice(320);
    }

    signHex(hexMessage: string): Promise<string> {
        return CryptoUtil.Crypto.signHex(hexMessage, this.privateKey);
    }

    signStr(message: string): Promise<string> {
        return this.signHex(Converters.strToHex(message));
    }

    async encrypt(password: string) {
        return KeyEncryption.encryptHex(this.publicKey + this.privateKey, password);
    }
}