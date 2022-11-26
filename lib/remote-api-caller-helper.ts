import { RemoteAPICaller } from "./gmd-api-caller.js";
import { IError, ITransactionJSON } from "./transactions/transaction.js";


export class RemoteAPICallerHelper extends RemoteAPICaller {
    //Latest block
    async getBlockNumber(): Promise<number> {
        const data = await this.apiCall<{ height: number }>('get', { requestType: 'getBlock' } as Record<string, string>)
        return data.height;
    }

    async getBalance(rsAccount: string): Promise<string> {
        const data = await this.apiCall<IGetBalanceResponse>('get', { requestType: 'getBalance', account: rsAccount } as Record<string, string>);
        return data.balanceNQT;
    }

    async getTransactions<T>(outbound: boolean, rsAccount: string, pageSize = 10, page = 0, type: number | null = null, subtype: number | null = null) : Promise<Array<T>> {
        const request: IGetTransactionRequest = {
            requestType: 'getTransactionsBulk',
            pageSize: pageSize,
            page: page

        };
        if (type !== null) {
            request.filterByType = type;
            if (subtype !== null) {
                request.filterBySubtype = subtype;
            }
        }
        if (outbound) {
            request.filterBySender = rsAccount;
        } else {
            request.filterByReceiver = rsAccount;
        }
        const data = await this.apiCall<IGetTransactionsResponse<T>>('get', request as unknown as Record<string, string | number | boolean>);
        return data.Transactions;
    }

    getTransaction(fullHash: string) {
        return this.apiCall<ITransactionJSON | IError>('get', { requestType: 'getTransaction', fullHash: fullHash });
    }

    getPublicKey(rsAccount: string) {
        return this.apiCall<{ publicKey?: string, errorDescription?: string}>('get', { requestType: 'getAccountPublicKey', account: rsAccount });
    }

        /**
     * 
     * Will retrieve the list of forgers and their hit times and compute an array of time deltas between forgers hit times.
     * @param timeout timeout of the wait in seconds.
     * @returns an array of time deltas between forgers hit times.
     */
    public async getTimeUntilNextBlockGeneration(timeout: number): Promise<number[]> {
        const [timeRes, generatorsRes] = await Promise.all([
            this.apiCall<{ time: number }>('get', { requestType: "getTime" }),
            this.apiCall<INextBlockGenerators>('get', { requestType: "getNextBlockGenerators", limit: 20 })
        ]);
        return RemoteAPICallerHelper.getSleepTimesFromGenHitTimes(timeRes.time, generatorsRes.generators, timeout);
    }

        /**
     * 
     * @param time time when the forgers for next block was retrieved (approx current time) - relative time of the blockchain (in seconds since blockchain creation).
     * @param generators the array of first max 20 forgers that can generate current block
     * @param timeout the maximum time we can wait for a block to be generated in seconds. 0 to disable timeout.
     * @returns an array of sleep times in ms necessary for pauses between possible block generators of forgers. 
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
            if (t > 0) {
                if (t > timeout && timeout > 0) {
                    break;
                }
                sleepTimesMs.push(delta * 1000);
                totalSleepTime += delta;
            }

        }
        return sleepTimesMs;
    }

    public getNodeState() {
        return this.apiCall<INodeState>('get', { requestType: "getState" });
    }

    public async isNodeHealthy(): Promise<boolean> {
        try {
            const res = await this.getNodeState();
            return res.numberOfBlocks > 0 
                && res.blockchainState === "UP_TO_DATE"
                && res.isLightClient === false
                && res.isScanning === false
                && res.isDownloading === false
                && res.numberOfPeers > 5 
                && res.numberOfActivePeers > 2
        } catch (e) {
            return false;
        }
    }


}

export interface IGetTransactionRequest {
    requestType: string,
    pageSize: number,
    page: number,
    filterBySender?: string,
    filterByReceiver?: string,
    filterByType?: number,
    filterBySubtype?: number
}

interface IGetBalanceResponse {
    balanceNQT: string
}

interface IGetTransactionsResponse<T> {
    Transactions: Array<T>;
}
interface INextBlockGenerators {
    activeCount: number,
    lastBlock: string,
    generators: Array<IForger>,
    timestamp: number,
    height: number
}

interface IForger {
    effectiveBalanceNXT: number,
    accountRS: string,
    deadline: number,
    account: string,
    hitTime: number
}

interface INodeState {
    numberOfPeers: number,
    blockchainState: string,
    numberOfBlocks: number,
    isTestnet: boolean,
    isLightClient: boolean,
    services: Array<string>,
    version: string,
    lastBlock: string,
    application: string,
    isScanning: boolean,
    isDownloading: boolean,
    time: number,
    numberOfActivePeers: number
}