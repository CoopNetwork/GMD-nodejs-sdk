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