import { CryptoUtil } from "../crypto-util.js";
import { RemoteAPICaller } from "../gmd-api-caller.js";
import { Provider } from "../provider.js";
import { Signer } from "../signer.js";

import Converters = CryptoUtil.Converters;

export enum TransactionState {
    ERROR = 'error',
    REQUEST_CREATED = 'request_created',
    UNSIGNED = 'unsigned',
    SIGNED = 'signed',
    BROADCASTED = 'broadcasted',
    CONFIRMED = 'confirmed',
    REJECTED = 'rejected'
}

/**
 * Any transaction has 5 steps:
 * 1. Create request JSON
 * 2. Process request JSON to an unsigned transaction (remote API call to a node is necessary)
 * 3. Sign the unsigned transaction
 * 4. Broadcast the signed transaction (remote API call to a node is necessary)
 * 5. [Optional] Transaction is confirmed after the transaction is written to the blockchain and at least
 *    one block is written on top of the transaction block (remote API call to a node is necessary).
 * 
 * The state of the transaction can only go through each step in the specified order.
 */
export class Transaction {
    private _requestJSON: IRequestJSON | null = null;
    private _unsignedTransactionBytes: string | null = null;
    private _signedTransactionBytes: string | null = null;
    private _state: TransactionState;
    private _transactionID: string | null = null;
    private _fullHash: string | null = null;
    private _transactionJSON: ITransactionJSON | null = null;


    //========== Step 1 (local)=============
    protected constructor(requestJSON?: IRequestJSON) {
        if (requestJSON) {
            this._requestJSON = requestJSON;
            this._state = TransactionState.REQUEST_CREATED;
        } else {
            this._state = TransactionState.ERROR;
        }
    }

    async calculateFee(remote: RemoteAPICaller) {
        const transactionData = await remote.apiCall<ITransaction>('post', { ...this.requestJSON, feeNQT: '0' } as unknown as Record<string, string>);
        return CryptoUtil.Crypto.NqtToGmd(transactionData.transactionJSON.feeNQT);
    }

    setFee(feeGMD: string) {
        if (this.state === TransactionState.REQUEST_CREATED) {
            (this.requestJSON as IRequestJSON).feeNQT = CryptoUtil.Crypto.GmdToNqt(feeGMD);
        } else {
            throw new Error('Cannot set fee after the unsigned transaction was already created');//TODO refine errors
        }
    }
    //======================================


    //========== Step 2 (remote)=============
    async createUnsignedTransaction(remote: RemoteAPICaller) {
        if (this.canCreateUnsignedTransaction()) {
            const unsignedTransaction = await remote.apiCall<IUnsignedTransaction>('post', this.requestJSON as unknown as Record<string, string>);
            this.onCreatedUnsignedTransaction(unsignedTransaction.unsignedTransactionBytes);
        } else {
            throw new Error('createUnsignedTransaction cannot be processed. transaction=' + JSON.stringify(this));
        }
    }

    canCreateUnsignedTransaction(): boolean {
        if (this._requestJSON && 'secretPhrase' in this._requestJSON) {
            throw new Error('Do not send secret password to node!');
        }
        return this.state === TransactionState.REQUEST_CREATED;
    }

    private onCreatedUnsignedTransaction(unsignedTransactionBytes: string) {
        if (this.canCreateUnsignedTransaction() && Converters.isHex(unsignedTransactionBytes)) {
            this._unsignedTransactionBytes = unsignedTransactionBytes;
            this._state = TransactionState.UNSIGNED;
        } else {
            throw new Error('onTransactionRequestProcessed: Transaction cannot be processed');
        }
    }
    //======================================


    //========== Step 3 (local)=============
    async sign(signer: Signer) {
        if (this.state === TransactionState.UNSIGNED && this.unsignedTransactionBytes && Converters.isHex(this.unsignedTransactionBytes)) {
            const signedTransactionBytes = await signer.signTransactionBytes(this.unsignedTransactionBytes);
            this.onSigned(signedTransactionBytes);
            return this;
        } else {
            throw new Error('Cannot sign transaction ' + JSON.stringify(this));
        }
    }
    canBeSigned(): boolean {
        return this._state === TransactionState.UNSIGNED && Converters.isHex(this._unsignedTransactionBytes);
    }
    private onSigned(signedTransactionBytes: string) {
        if (this.canBeSigned() && Converters.isHex(signedTransactionBytes)) {
            this._signedTransactionBytes = signedTransactionBytes;
            this._state = TransactionState.SIGNED;
        }
    }
    //=======================================


    //========== Step 4 (remote)=============
    async broadcast(remote: RemoteAPICaller) {
        if (this.canBroadcast() && this.signedTransactionBytes) {
            const result: ITransactionBroadcasted = await this.broadcastFromHex(this.signedTransactionBytes, remote)
            this.onBroadcasted(result);
            return result;
        } else {
            throw new Error('broadCastTransaction cannot be processed. transaction=' + JSON.stringify(this));
        }
    }

    broadcastFromHex(signedTransactionHex: string, remote: RemoteAPICaller): Promise<ITransactionBroadcasted> {
        return remote.apiCall<ITransactionBroadcasted>('post', { requestType: 'broadcastTransaction', transactionBytes: signedTransactionHex });
    }

    canBroadcast(): boolean {
        return Converters.isHex(this.signedTransactionBytes) && this.state === TransactionState.SIGNED;
    }

    private onBroadcasted(result: ITransactionBroadcasted) {
        if (this.canBroadcast()) {
            this._transactionID = result.transaction;
            this._fullHash = result.fullHash;
            this._state = TransactionState.BROADCASTED;
        } else {
            throw new Error('Something went wrong on transaction broadcast');
        }

    }
    //=======================================


    //========== [Optional]Step 6 (remote) =============
    /**
     * Waits for a transaction to be written to the blockchain.
     * Statistical average for this wait is 30s, but it can take up to a few minutes depending on the number of active forgers.
     * 
     * @param provider a provider
     * @param timeout timeout of the wait in seconds.
     * @returns the confirmed transaction json
     */
     public async waitConfirmation(provider: Provider, timeout = 300) {
        if (this.canWaitConfirmation()) {
            const startTime = Date.now();
            do {
                const height = await provider.waitForNewBlock(timeout);
                if(height !== undefined) {
                    let response;
                    try {
                        response = await provider.getTransaction(this._fullHash as string);
                    } catch (error) {}
                    if (!Transaction.isErrorResponse(response)) {
                        return this.onConfirmation(response as ITransactionJSON);
                    }
                }
                await new Promise(r => setTimeout(r, 5000));
            } while (Date.now() - startTime < timeout * 1000);
        }
        throw new Error('Transaction cannot be confirmed');
     }

    public canWaitConfirmation() {
        return (this.state === TransactionState.BROADCASTED && this._fullHash != null)
    }

    private onConfirmation(response: ITransactionJSON) {
        if (this.canWaitConfirmation()) {
            this._state = TransactionState.CONFIRMED;
            this._transactionJSON = response;
        }
        return response;
    }

    //=======================================

    ////// getters
    get requestJSON(): IRequestJSON | null {
        return this._requestJSON;
    }

    get state(): TransactionState {
        return this._state;
    }

    get unsignedTransactionBytes(): string | null {
        return this._unsignedTransactionBytes;
    }

    get signedTransactionBytes(): string | null {
        return this._signedTransactionBytes;
    }

    get fullHash(): string | null {
        return this._fullHash;
    }

    get transactionJSON(): ITransactionJSON | null {
        return this._transactionJSON;
    }

    get transactionID(): string | null {
        return this._transactionID;
    }



    //static functions
    static createTransactionFromRequestJSON(requestJSON: IRequestJSON) {
        return new Transaction(requestJSON);
    }

    static createTransactionFromBytes(bytes: string, signed: boolean) {
        const transaction = new Transaction();
        if (signed) {
            transaction._signedTransactionBytes = bytes;
            transaction._state = TransactionState.SIGNED;
        } else {
            transaction._unsignedTransactionBytes = bytes;
            transaction._state = TransactionState.UNSIGNED;
        }
        return transaction;
    }

    public static getTransactionJSONFromBytes(bytes: string, remote: RemoteAPICaller) {
        return remote.apiCall<ITransactionJSON>('get', { requestType: 'parseTransaction', transactionBytes: bytes });
    }

    public static isErrorResponse(obj: unknown) {
        const err = obj as IError;
        return err && err.errorCode && typeof (err.errorCode) == 'number'
            && err.errorDescription && typeof (err.errorDescription) == 'string';
    }
}


export interface IRequestJSON {
    requestType: string,
    recipient: string,
    publicKey: string,
    feeNQT: string,
    deadline: number,
    message?: string
}

export interface ITransactionBroadcasted {
    fullHash: string,
    transaction: string
}

export interface ITransaction {
    transactionJSON: ITransactionJSON,
}

export interface ITransactionJSON {
    senderPublicKey: string,
    feeNQT: string,
    type: TransactionType,
    subtype: number,
    version: 1,
    phased: boolean,
    ecBlockId: string,
    attachment: unknown,
    senderRS: string,
    amountNQT: string,
    sender: string,
    recipientRS: string,
    recipient: string,
    ecBlockHeight: number,
    deadline: number,
    timestamp: number,
    height: number,
    signature?: string,
    fullHash?: string,
    confirmations?: number
}

export interface IError {
    errorDescription: string,
    errorCode: number
}

export interface INextBlockGenerators {
    activeCount: number,
    lastBlock: string,
    generators: Array<IForger>,
    timestamp: number,
    height: number
}

export interface IForger {
    effectiveBalanceNXT: number,
    accountRS: string,
    deadline: number,
    account: string,
    hitTime: number
}



export interface IUnsignedTransaction {
    unsignedTransactionBytes: string
}

export enum TransactionType {
    PAYMENT = 0,
    MESSAGING = 1,
    COLORED_COINS = 2,
    DIGITAL_GOODS = 3,
    ACCOUNT_CONTROL = 4,
    MONETARY_SYSTEM = 5,
    DATA = 6,
    SHUFFLING = 7
}