### Intro 

- This is an SDK to interact with Coop Network Node.
- Main use is for local signing of transactions.
- Offers helper functions to easily call Coop Network node API.


### Instructions
  ```
  npm install
  npm run build
  npm run test
  ```


### Examples on hot to call the GMD node API
- For a complete list of API endpoints and their exact parameters you can see them on any node in a browser at address <GMD node address>/test (e.g. https://node.thecoopnetwork.io/test )
- All examples in this readme.txt can also be found and ran in test directory.

#### Wallet
```
    import { Wallet, Provider } from 'gmd-sdk';

    //generate a random passphrase of 12 words
    let passPhrase = Wallet.generatePassphrase(12);
    
    //generate a wallet from a passphrase
    //please note that wallet does not store the mnemonic passphrase, but only the generated private key and public key. Mnemonic passphrase cannot be recovered by using Wallet.
    let wallet = await Wallet.fromPassphrase(passPhrase);

    //Create encrypted JSON:
    let encryptedJSON = await Wallet.encryptedJSONFromPassPhrase(passPhrase, "password example 123@@!");
    //recover wallet from encrypted json:
    let wallet = await Wallet.fromEncryptedJSON(encryptedJSON, "password example 123@@!"); 

    //Any wallet operation requiring connection to remote node needs a provider. Provider may be set using wallet.connect(provider) For example wallet.getBallance() needs connectiion to a node.
    
    const provider = new Provider(new URL('https://node.thecoopnetwork.io:6877'));
    const wallet = await Wallet.fromPassphrase('some passphrase example of just a few words');
    wallet.connect(provider);
    const balance = await wallet.getBalance();

    

```

#### Provider
- Provider is the component that haddles all interactions with a remote GMD node. It extends the RemoteAPICaller class wich enables the calling of the REST API exposed by a node. Full list of REST API endpoints: https://node.thecoopnetwork.io/test
- Usage example:
```
    const provider = new Provider(new URL('https://node.thecoopnetwork.io:6877'));
    
    const params = { requestType: 'getTransactionsBulk', pageSize: 3, page: 0}
    const data = await provider.apiCall('get', paramsGetTransactions);
    console.log('List of latest 3 transactions: ' + JSON.stringify(data, null, 2));
```
- Getting the blockchain height:
```
    let blockNo = await provider.getBlockNumber();
    console.log('Blockchain height: ' + blockNo);
```


#### Transaction 
- Transaction is an abstract class that models all blockcahin transactions performed on the Coop Network blockchain.
- Any transaction has 5 steps:
  1. Create request JSON
  2. Process request JSON to an unsigned transaction (remote API call to a node is necessary)
  3. Sign the unsigned transaction
  4. Broadcast the signed transaction (remote API call to a node is necessary)
  5. [Optional] Transaction is confirmed after the trasaction is written to the blockchain and at leat one block is written on top of the transaction block (remote API call to a node is necessary).
  - The state of the transaction can only go through each step in the specified order as the output of each step is the input for the next step. 
  - Each step can be executed on different device as long as the output of the previous step is somehow transmited out-of-band (e.g. via QR code). This mechanism is usefull when signing happens on a mobile device. - None of the outputs of the described steps contain any secret so exposing a QR is a safe operation.

  - For now, only concrete implementation of Transaction is "SendMoney" class, but further transactions will be added in the future.
  - Example on how to use "SendMoney":
  ```
    provider = new Provider(new URL('https://node.thecoopnetwork.io:6877'));
    wallet = await Wallet.fromPassphrase('screen drawn leave power connect confidence liquid everytime wall either poet shook');

    transaction = SendMoney.createTransaction('GMD-43MP-76UW-L69N-ALW39', '0.0001', wallet.publicKey); // Step 1 - local
    await transaction.createUnsignedTransaction(provider); // Step 2 - remote call
    await transaction.signTransaction(wallet); // Step 3 - local call
    await transaction.broadcastTransaction(provider); // Step 4 - remote call
  ```

  - Calculating fee for a transaction request (before signing it) in GMD
```
    const transaction = SendMoney.createTransaction('GMD-43MP-76UW-L69N-ALW39', '0.0001', wallet.publicKey);
    const fee = await transaction.calculateFee(provider);
    
    // calculateFee() does not change the state of the transaction but only returns a fee. To set the fee 
    // before the unsigned transaction is created, call Transaction.setFee(). Setting fee will throw error if unsigned transaction was already created.
    transaction.setFee(fee);
```

#### Encryption
- This is an example of encrypting on arbitrary string (encryptStr/decryptToStr). 
```
import KeyEncryption from "gmd-sdk";

const testString = "String was correctly decrypted";
const password = "Some password1!@#$%^&*()_+{}:|<>?/.,\;][=-"

(async () => {
    const encrypted = await KeyEncryption.encryptStr(testString, password);

    const decrypted = await KeyEncryption.decryptToStr(encrypted, password);
    console.assert(decrypted == testString, "decryption failed");
})();
```
- For encrypt/decrypt hex strings use encryptHex/decryptToHex (this is useful for encrypting private keys). Example similar to above except input is in the hex format (digits "0123456789abcdef", no 0x prefix). The number of hex digits must be even (as each byte is 2 hex digits and this string is coverted to bytes before encryption). Caller must ensure that number of hex digits is even, or pad with addition 0 prefix.
- For encrypt/decrypt array of bytes, use encryptBytes/decryptToBytes.