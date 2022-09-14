import { CryptoUtil } from './crypto-util.js';
import { KeyEncryption, IEncryptedJSON } from './key-encryption.js';
import PassPhraseGenerator from './pass-gen.js'
import { Provider } from './provider.js';
import { Signer } from './signer.js';
import { SendMoney } from './transactions/send-money.js';



export class Wallet extends Signer {
    accountId: string;
    accountRS: string;
    provider: Provider | null;
    constructor(publicKey: string, privKey: string, accountId: string, provider: Provider | null = null) {
        super(publicKey, privKey);
        this.accountId = accountId;
        this.accountRS = CryptoUtil.Crypto.accountIdToRS(accountId);
        this.provider = provider;
    }

    connect(provider: Provider) {
        this.provider = provider;
    }

    async getBalance(): Promise<string | undefined> {
        this.checkProvider();
        return this.provider?.getBalance(this.accountRS);

    }

    async sendGMD(to: string, amountGMD: string) {
        const transaction = await this.createUnsignedSendGMDTransaction(to, amountGMD);
        await transaction.signTransaction(this);
        await transaction.broadcastTransaction(this.provider as Provider);
        return transaction;
    }

    async createUnsignedSendGMDTransaction(to: string, amountGMD: string) {
        this.checkProvider();
        const transaction = SendMoney.createTransaction(to, amountGMD, this.publicKey);
        await transaction.createUnsignedTransaction(this.provider as Provider);
        return transaction;
    }

    async getTransactions(outbound: boolean, pageSize: number, page: number) {
        this.checkProvider();
        this.provider?.getTransactions(outbound, this.accountRS, pageSize, page);
    }

    async encrypt(password: string) {
        return KeyEncryption.encryptHex(this.publicKey + this.privateKey, password);
    }


    private checkProvider() {
        if (this.provider == null) {
            throw new Error('Wallet operation requires a Provider to be connected');
        }
    }

    //static wallet creation functions
    static async fromPassphrase(passPhrase: string) {
        const { publicKey, privateKey } = await CryptoUtil.Crypto.getWalletDetails(passPhrase);
        const accountId = await CryptoUtil.Crypto.publicKeyToAccountId(publicKey);
        return new Wallet(publicKey, privateKey, accountId);
    }

    static async encryptedJSONFromPassPhrase(passPhrase: string, encryptionPassword: string) {
        const { publicKey, privateKey } = await CryptoUtil.Crypto.getWalletDetails(passPhrase);
        return KeyEncryption.encryptHex(publicKey + privateKey, encryptionPassword);
    }

    static async fromEncryptedJSON(encryptedJSON: IEncryptedJSON, encryptionPassword: string): Promise<Wallet> {
        const decrypted = await KeyEncryption.decryptToHex(encryptedJSON, encryptionPassword);
        const publicKey = decrypted.substring(0, 64);
        const privateKey = decrypted.substring(64);
        const accountId = await CryptoUtil.Crypto.publicKeyToAccountId(publicKey);
        return new Wallet(publicKey, privateKey, accountId);
    }

    static async accountIdFromPublicKey(publicKeyHex: string): Promise<string> {
        return CryptoUtil.Crypto.publicKeyToAccountId(publicKeyHex);
    }

    static generatePassphrase(numberOfWords?: number): string {
        return PassPhraseGenerator.generatePass(numberOfWords);
    }
}