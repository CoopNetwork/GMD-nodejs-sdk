import { expect, test } from '@jest/globals';

import { SendMoney, Provider, Wallet, CryptoUtil } from '../dist/index.js';
import { TransactionState, ITransactionJSON, Transaction, TransactionType } from '../dist/transactions/transaction.js';

const keyRegex = /^[0-9a-fA-F]{64}$/;
const signedTransactionRegex = /^[0-9a-fA-F]{322,}$/;
const unsignedTransactionRegex = /^[0-9a-fA-F]{192,}0{128}[0-9a-fA-F]{2,}$/;
const provider = new Provider(new URL('https://node2.thecoopnetwork.io:6877'));

jest.setTimeout(180000);

test('Test send money', async () => {
    const wallet = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');

    const transaction = SendMoney.createTransaction('GMD-43MP-76UW-L69N-ALW39', CryptoUtil.Crypto.GmdToNqt('0.0001'), wallet.publicKey as string);

    //Optional: calculate fee. If fee is not calculated the default value of 1 GMD will be attempted.
    ////////////
    const fee = await transaction.calculateFee(provider);
    console.log('fee is: ' + fee)
    transaction.setFee(fee);
    expect(fee).not.toBeNaN();
    expect(transaction.state).toBe(TransactionState.REQUEST_CREATED);
    console.log(transaction.requestJSON);
    ////////////
    await transaction.createUnsignedTransaction(provider);
    expect(transaction.state).toBe(TransactionState.UNSIGNED);
    expect(transaction.unsignedTransactionBytes).toMatch(unsignedTransactionRegex);
    console.log('unsigned transaction bytes: ' + transaction.unsignedTransactionBytes);

    const signResult = await transaction.sign(wallet);
    expect(transaction.state).toBe(TransactionState.SIGNED);
    expect(transaction.signedTransactionBytes).toMatch(signedTransactionRegex);
    console.log( 'signed transaction bytes' ,signResult);

    const resultBroadcast = await transaction.broadcast(provider);
    expect(transaction.state).toBe(TransactionState.BROADCASTED);
    expect(resultBroadcast.fullHash).toMatch(keyRegex);
    expect(resultBroadcast.transaction).not.toBeNaN();
    console.log('Submitted for broadcast: ', resultBroadcast);

    //comment the optional step of waiting for blockchain confirmation as it takes about one minute and tests would take too long
    // console.log('Waiting for blockchain confirmation...');
    // await transaction.waitConfirmation(provider); 
    // console.log('Transaction confirmed!');
    // await new Promise(resolve => setTimeout(resolve, 1800000));
});

test('Transaction from bytes', async () => {
    const wallet = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');
    const transaction = SendMoney.createTransaction('GMD-43MP-76UW-L69N-ALW39', CryptoUtil.Crypto.GmdToNqt('0.0001'), wallet.publicKey as string);
    await transaction.createUnsignedTransaction(provider);

    const transactionJson2: ITransactionJSON = await Transaction.getTransactionJSONFromBytes(transaction.unsignedTransactionBytes as string, provider);
    expect(transactionJson2.senderRS).toBe('GMD-N2L2-GZXR-NES8-CJMBC');
    expect(transactionJson2.recipientRS).toBe('GMD-43MP-76UW-L69N-ALW39');
    expect(transactionJson2.amountNQT).toBe('10000');
    expect(transactionJson2.deadline).toBe(1440);
    expect(transactionJson2.type).toBe(TransactionType.PAYMENT);
});