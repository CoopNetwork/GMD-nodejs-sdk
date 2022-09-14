import { CryptoUtil } from "./crypto-util.js";
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
        const nqt = data.balanceNQT;
        return CryptoUtil.Crypto.NqtToGmd(nqt);
    }

    async getTransactions(outbound: boolean, rsAccount: string, pageSize = 10, page = 0, type: number | null = null, subtype: number | null = null) {
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
        const data = await this.apiCall<IGetTransactionsResponse>('get', request as unknown as Record<string, string | number | boolean>);
        return data.Transactions;
    }

    getTransaction(fullHash: string) {
        return this.apiCall<ITransactionJSON | IError>('get', { requestType: 'getTransaction', fullHash: fullHash });
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

interface IGetTransactionsResponse {
    Transactions: Array<Record<string, string | number | boolean>>;
}