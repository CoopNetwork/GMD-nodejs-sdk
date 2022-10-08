import { Provider, Transaction, Wallet , WalletPublic, TransactionState, CryptoUtil} from "../dist/index.js";


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

interface ITransactionFromHistory{
    SENDER_ID: string;
    FULL_HASH: string;
    HEIGHT: number;
    RECIPIENT_ID: string;
    
        // {
        //   TRANSACTION_INDEX: 0,
        //   BLOCK_ID: -2614903333156865000,
        //   SENDER_ID: 'GMD-43MP-76UW-L69N-ALW39',
        //   FEE: 200000000,
        //   type_obj: {
        //     SUBTYPE: 0,
        //     subtype_str: 'ordinary_payment',
        //     type_str: 'payment',
        //     TYPE: 0
        //   },
        //   HEIGHT: 61673,
        //   SIGNATURE: 'df0209907c86429cf8060e0a19c8595035bc353b5e54d670305ce042afc9f106ff04cb6b9e0732a89c3581f70b621422c9ca752ae4616da99da5d339b0ab9fed',
        //   PHASED: false,
        //   ATTACHMENT_BYTES: '01490000807b2272656d6f74654e6574776f726b223a22706f6c79676f6e222c2272656d6f746541646472657373223a22307832333436356163373664303938303938656639303830393863227d',
        //   AMOUNT: 500000000,
        //   TIMESTAMP: 28372899,
        //   ID: 1758052202646137000,
        //   RECIPIENT_ID: 'GMD-UNNX-563R-B54G-9RSZK',
        //   BLOCK_TIMESTAMP: 28373402,
        //   FULL_HASH: '3ce950eb29db651885e92f547d9940871a424e9155376d75ffdf6b6ad3d0e41b'
        // },
}

/**
 * get last 3 inbound transactions and last 3 outbound transactions
 */
test('getTransactionHistory inbound', async () => {
    const wallet = await Wallet.fromRS(rs, provider); //provider is always required to get the public key from RS
    const [transactionsInbound, transactionsOutbound] = await Promise.all([
        wallet.getTransactions<ITransactionFromHistory>(false, 3, 0),
        wallet.getTransactions<ITransactionFromHistory>(true, 3, 0)
    ]);

    console.log('inbound transactions for '+wallet.accountRS, transactionsInbound);
    console.log('outbound transactions for '+wallet.accountRS, transactionsOutbound);

    expect(transactionsInbound).not.toBeUndefined();
    expect(transactionsOutbound).not.toBeUndefined();

    expect((transactionsInbound?.length as number) == 3).toBe(true);
    expect((transactionsOutbound?.length as number) >=2 ).toBe(true);
    
    const tx1 = transactionsInbound?.[0] as ITransactionFromHistory;
    expect(tx1.FULL_HASH).toMatch(keyRegex);
    expect(tx1.HEIGHT).not.toBeNaN();
    expect(CryptoUtil.Crypto.isValidRS(tx1.SENDER_ID as string)).toBe(true);

    const tx2 = transactionsOutbound?.[0] as ITransactionFromHistory;
    expect(tx2.FULL_HASH).toMatch(keyRegex);
    expect(tx2.HEIGHT).not.toBeNaN();
    expect(CryptoUtil.Crypto.isValidRS(tx2.SENDER_ID as string)).toBe(true);
});



