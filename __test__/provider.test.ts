import { CryptoUtil, Provider } from '../dist/index.js';
import { expect, test } from '@jest/globals';

let provider = new Provider(new URL('https://node2.thecoopnetwork.io:6877'));
const pageSize = 3;
const keyRegex = /^[0-9a-fA-F]{64}$/;

jest.setTimeout(120000);

test('Get transactions bulk', async () => {
    const paramsGetTransactions = {
        requestType: 'getTransactionsBulk',
        pageSize: pageSize,
        page: 0
    }


    let data = await provider.apiCall<{ Transactions: Array<Record<string, string | number>> }>('get', paramsGetTransactions);
    expect(Array.isArray(data.Transactions)).toBe(true);
    expect(data.Transactions.length).toBe(pageSize);
    const fullhash0 = data.Transactions[0].FULL_HASH;
    const height1 = data.Transactions[1].HEIGHT;
    const sender2 = data.Transactions[2].SENDER_ID;
    expect(fullhash0).toMatch(keyRegex);
    expect(height1).not.toBeNaN();
    expect(CryptoUtil.Crypto.isValidRS(''+sender2)).toBe(true);
})

test('Get block no', async () => {
    const blockNo = await provider.getBlockNumber();
    expect(blockNo).not.toBeNaN();
});

test('Get outbound transactions', async () => {
    const rs = 'GMD-N2L2-GZXR-NES8-CJMBC';
    const data = await provider.getTransactions(true, rs, 1, 0);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].SENDER_ID).toBe(rs);
    expect(data[0].FULL_HASH).toMatch(keyRegex);
});

test('Get public key', async () => {
    const data = await provider.getPublicKey('GMD-N2L2-GZXR-NES8-CJMBC');
    expect(data.publicKey).toBe("f72258e2be98b5047c0cb4ff667b48a100699bf175122027aafd4182835f3c2e");
});

test('Get inexistent public key', async () => {
    const data = await provider.getPublicKey('GMD-W2MZ-M9WK-G2LJ-WWWWW');
    console.log(data);
    expect(data.errorDescription).toBe("Incorrect \"account\"");
});
