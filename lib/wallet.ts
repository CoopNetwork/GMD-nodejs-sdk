import { CryptoUtil } from './crypto-util.js';
import { KeyEncryption, IEncryptedJSON } from './key-encryption.js';
import PassPhraseGenerator from './pass-gen.js';
import { Provider } from './provider.js';
import { Signer } from './signer.js';
import { WalletPublic } from './wallet-public.js';


export class Wallet extends Signer {
    protected constructor(publicKey: string, privateKey: string, accountRS:string, provider: Provider | null = null ) {
        super(publicKey, privateKey, accountRS, provider);
    }

    async sendGMD(to: string, amountGMD: string) {
        const transaction = await this.createUnsignedSendGMDTransaction(to, amountGMD);
        await transaction.sign(this);
        await transaction.broadcast(this.provider as Provider);
        return transaction;
    }

    static generatePassphrase(numberOfWords?: number): string {
        return PassPhraseGenerator.generatePass(numberOfWords);
    }


    //static wallet creation functions
    static async fromPassphrase(passPhrase: string) {
        const { publicKey, privateKey } = await CryptoUtil.Crypto.getWalletDetails(passPhrase);
        return Wallet.fromKey(publicKey, privateKey) as Promise<Wallet>;
    }

    static async encryptedJSONFromPassPhrase(passPhrase: string, encryptionPassword: string) {
        const { publicKey, privateKey } = await CryptoUtil.Crypto.getWalletDetails(passPhrase);
        return KeyEncryption.encryptHex(publicKey + privateKey, encryptionPassword);
    }

    static async fromEncryptedJSON(encryptedJSON: IEncryptedJSON, encryptionPassword: string): Promise<Wallet> {
        const decrypted = await KeyEncryption.decryptToHex(encryptedJSON, encryptionPassword);
        const publicKey = decrypted.substring(0, 64);
        const privateKey = decrypted.substring(64);
        return Wallet.fromKey(publicKey, privateKey) as Promise<Wallet>;
    }

    static async fromRS(accountRS: string, provider: Provider): Promise<WalletPublic> {
        const publicKeyResp = await provider.getPublicKey(accountRS);
        let publicKey;
        if( !publicKeyResp.errorDescription ) {
            publicKey = publicKeyResp.publicKey;
        }
        return new WalletPublic(publicKey, accountRS, provider);
    }
    
    static async fromKey(publicKey: string, privateKey?: string, provider: Provider | null = null): Promise<Wallet | WalletPublic> {
        const accountRS = await CryptoUtil.Crypto.publicKeyToRSAccount(publicKey);
                
        if(privateKey){
            return new Wallet(publicKey, privateKey, accountRS, provider);
        } else {
            return new WalletPublic(publicKey, accountRS, provider);
        }
    }
}