import { expect, test } from '@jest/globals';
import { Wallet, Provider } from '../dist/index.js';
import { TransactionState } from '../dist/transactions/transaction.js';


const secretPassphrase = "this is a paasphrase example";
const pubKey = "9c7bba1b3e2647290a92342d622c0c0514521a35a1670a20612c64666f035938";
//const privKey = "39c8834113346ed3ba6ac90eff170a302a9264680f9d5a578931dd2c22d65e05";
const accountId = '5224136646640665215';
const accountRS = 'GMD-W2MZ-M9WK-G2LJ-6WYZJ';
const provider = new Provider(new URL('https://node2.thecoopnetwork.io:6877'));
const keyRegex = /^[0-9a-fA-F]{64}$/;
const rsRegex = /^GMD(\-([2-9a-zA-Z]){4}){3}\-([2-9a-zA-Z]){5}$/
const signedTransactionRegex = /^[0-9a-fA-F]{322,}$/

test('Wallet from passphrase', async () => {
    const wallet = await Wallet.fromPassphrase(secretPassphrase);
    expect(wallet.publicKey).toBe(pubKey);
    expect(wallet.accountId).toBe(accountId);
    expect(wallet.accountRS).toBe(accountRS);
})

test('Wallet from encryptedJSON', async () => {
    const encryptedJSON = await Wallet.encryptedJSONFromPassPhrase(secretPassphrase, "password example 123@@!");
    const wallet = await Wallet.fromEncryptedJSON(encryptedJSON, "password example 123@@!");
    expect(wallet.publicKey).toBe(pubKey);
    expect(wallet.accountId).toBe(accountId);
    expect(wallet.accountRS).toBe(accountRS);
})

test('Wallet passphrase generation', async () => {
    const passPhrase = Wallet.generatePassphrase();
    console.log('new passphrase generated:' + passPhrase);
    const wallet = await Wallet.fromPassphrase(passPhrase);
    console.log('New wallet generated: ' + JSON.stringify(wallet, null, 2));
    expect(wallet.publicKey).toMatch(keyRegex);
    expect(wallet.accountRS).toMatch(rsRegex);
})

test('Get balance', async () => {
    const wallet = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');
    wallet.connect(provider);

    const balance = await wallet.getBalance();
    expect(balance).not.toBeNaN();
})

test('Send GMD', async () => {
    const wallet = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');
    wallet.connect(provider);
    const transaction = await wallet.sendGMD('GMD-43MP-76UW-L69N-ALW39', '0.0001');
    expect(transaction.signedTransactionBytes).toMatch(signedTransactionRegex);
    expect(transaction.state).toBe(TransactionState.BROADCASTED);
    console.log(JSON.stringify(transaction, null, 2));
})

test('Encryp decryp wallet', async () => {
    const wallet = await Wallet.fromPassphrase(secretPassphrase);
    const encryptedJSON = await wallet.encrypt('password');

    const wallet2 = await Wallet.fromEncryptedJSON(encryptedJSON, 'password');
    expect(wallet2.publicKey).toBe(pubKey);
    expect(wallet2.accountId).toBe(accountId);
    expect(wallet2.accountRS).toBe(accountRS);
})



