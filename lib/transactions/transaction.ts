import { CryptoUtil } from "../crypto-util.js";
import { RemoteAPICaller } from "../gmd-api-caller.js";
import { RemoteAPICallerHelper } from "../remote-api-caller-helper.js";
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
 * 5. [Optional] Transaction is confirmed after the trasaction is written to the blockchain and at leat
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
    async signTransaction(signer: Signer) {
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
    async broadcastTransaction(remote: RemoteAPICaller) {
        if (this.canBroadcast() && this.signedTransactionBytes) {
            const result: ITransactionBroadcasted = await this.broadCastTransactionFromHex(this.signedTransactionBytes, remote)
            this.onBroadcasted(result);
            return result;
        } else {
            throw new Error('broadCastTransaction cannot be processed. transaction=' + JSON.stringify(this));
        }
    }

    broadCastTransactionFromHex(signedTransactionHex: string, remote: RemoteAPICaller): Promise<ITransactionBroadcasted> {
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
     * @param remote a provider
     * @param timeout timeout of the wait in seconds.
     * @returns the confirmed transaction json
     */
    public async waitConfirmation(remote: RemoteAPICallerHelper, timeout = 300) {
        if (this.canWaitConfirmation()) {
            const sleepTimes = await Transaction.getTimeUntilNextBlockGeneration(remote, timeout);
            let drift = 0;
            for (const sleep of sleepTimes) {
                const t0 = Date.now();
                await new Promise(r => setTimeout(r, sleep - drift + 100)); //sleep until earliest next block can be generated + 100ms buffer
                const response = await remote.getTransaction(this._fullHash as string);//getTRansaction returns either an error json (if transaction is not yet in the blockchain), either a transaction json
                if (!Transaction.isErrorResponse(response)) {
                    return this.onConfirmation(response as ITransactionJSON);
                }
                drift = Date.now() - t0 - sleep; //drift is the actual time it takes a loop to execute minus desired sleep time. Roughly 600ms in tests.
            }
        }
        throw new Error('Cannot wait confirmation. Current Transaction state=' + this.state);

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
    }

    /**
     * 
     * @param remote a provider. the provider is needed to retrieve the list of forgers and their hit times.
     * @param timeout timeout of the wait in seconds.
     * @returns an array of time deltas between forgers hit times.
     */
    private static async getTimeUntilNextBlockGeneration(remote: RemoteAPICallerHelper, timeout: number): Promise<number[]> {
        const [timeRes, generatorsRes] = await Promise.all([
            remote.apiCall<{ time: number }>('get', { requestType: "getTime" }),
            remote.apiCall<INextBlockGenerators>('get', { requestType: "getNextBlockGenerators", limit: 20 })
        ]);
        return Transaction.getSleepTimesFromGenHitTimes(timeRes.time, generatorsRes.generators, timeout);
    }

    /**
     * 
     * @param time time when the forgers for next block was retrieved (aprox current time) - relative time of the blockchain (in seconds since blockchain creation).
     * @param generators the array of first max 20 forgers that can generate current block
     * @param timeout the maximum time we can wait for a block to be generated in seconds
     * @returns an array of sleep times in ms necessary for pauses between posible block generators of forgers. 
     * 
     * This logic can be best explained by example: if current time is 46358100s and we have 3 generators
     * that will have hit times of 46358130s, 46358145s, 4635867s this function will return 3 time values in ms [30000, 15000, 22000]
     * This array will be used to sleep between attempts to get the new block.
     * 
     */
    private static getSleepTimesFromGenHitTimes(time: number, generators: Array<IForger>, timeout: number) {
        const adjustedTime = time - 20; //there is a time drift of 20s on each GMD node
        const sleepTimesMs: number[] = [];
        let totalSleepTime = 0;
        for (const gen of generators) {
            const t = gen.hitTime - adjustedTime;
            const delta = t - totalSleepTime;
            if (t >= 0) {
                if (t >= timeout) {
                    break;
                }
                sleepTimesMs.push(delta * 1000);
                totalSleepTime += delta;
            }

        }
        return sleepTimesMs;
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