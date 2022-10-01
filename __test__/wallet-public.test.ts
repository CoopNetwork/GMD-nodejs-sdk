import { Provider, Transaction, Wallet , WalletPublic, TransactionState} from "../dist/index.js";


const publicKey = 'a1a98c7948978f33d4200bb2a1612ce1e5073e2f2ce8a9c9293d85c6903fdc55';
const rs = 'GMD-43MP-76UW-L69N-ALW39';
const nodeURL = new URL('https://node2.thecoopnetwork.io:6877');
const provider = new Provider(nodeURL);
const keyRegex = /^[0-9a-fA-F]{64}$/;

test('Wallet public create from public key', async () => {
    const wallet = await Wallet.fromKey(publicKey);

    expect(wallet).toBeInstanceOf(WalletPublic);
    expect(wallet.accountRS).toBe(rs);
    expect(wallet.publicKey).toBe(publicKey);
});

test('Wallet public create from RS', async () => {
    const wallet = await Wallet.fromRS(rs, provider); //provider is always required to get the public key from RS

    expect(wallet).toBeInstanceOf(WalletPublic);
    expect(wallet.accountRS).toBe(rs);
    expect(wallet.publicKey).toBe(publicKey);
    
    expect(await wallet.getBalance()).not.toBeNaN();
});

test('Wallet public create unsigned transaction', async () => {
    const wallet = await Wallet.fromRS('GMD-N2L2-GZXR-NES8-CJMBC', provider);

    const transaction = await wallet.createUnsignedSendGMDTransaction('GMD-43MP-76UW-L69N-ALW39', '0.0001');
    const unsignedBytes = transaction.unsignedTransactionBytes as string;

    // unsignedBytes should be sent to a signer to sign it (e.g. a mobile app). QR can be used

    // assume that rest of this test is executed on the signer side (e.g. in a mobile app) after the transaction bytes are sent via QR

    
    const transaction2 = Transaction.createTransactionFromBytes(unsignedBytes, false);
    //create wallet that can sign the transaction
    const wallet2 = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');
    await transaction2.sign(wallet2);
    const resultBroadcast =  await transaction2.broadcast(provider);
    //comment the optional step of waiting for blockchain confirmation as it takes about one minute and tests would take too long
    //await transaction2.waitConfirmation(provider); 
    
    expect(transaction2.state).toBe(TransactionState.BROADCASTED);
    expect(resultBroadcast.fullHash).toMatch(keyRegex);
    expect(resultBroadcast.transaction).not.toBeNaN();
});

/**
 * get last 3 inbound transactions and last 3 outbound transactions
 */
test('getTransactionHistory inbound', async () => {
    const wallet = await Wallet.fromRS(rs, provider); //provider is always required to get the public key from RS
    const transactionsInbound = wallet.getTransactions(false, 3, 0);
    const transactionsOutbound = wallet.getTransactions(true, 3, 0);
    console.log('inbound transactions for '+wallet.accountRS, await transactionsInbound);
    console.log('outbound transactions for '+wallet.accountRS, await transactionsOutbound);
    expect(await transactionsInbound).not.toBeUndefined();
    expect(await transactionsOutbound).not.toBeUndefined();
    expect(((await transactionsInbound)?.length as number) == 3).toBe(true);
    expect(((await transactionsOutbound)?.length as number) >=2 ).toBe(true);
});



