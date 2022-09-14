import { expect, test } from '@jest/globals';
import KeyEncryption from "../dist/key-encryption.js";

const testString = "String was correctly decrypted";
//const testHex = "03af56c690be02";
const testHex = "c15aea1c549747369dbc6cef86516e4c";
const testHexInvalid = "03af56c690be021";
const password = "[{Infura}, {ID}, {Provider}, {GMD}, {CoopNetwork}]";


test('Encrypt decrypt arbitrary string', async () => {
    const encryptedJSON = await KeyEncryption.encryptStr(testString, password)
    console.log('EncryptedJSON=' + JSON.stringify(encryptedJSON, null, 2));

    const str = await KeyEncryption.decryptToStr(encryptedJSON, password);
    expect(str).toBe(testString);
    console.log(str);
})

test('Encrypt decrypt hex', async () => {
    const encryptedJSON = await KeyEncryption.encryptHex(testHex, password)
    console.log('EncryptedJSONHex=' + JSON.stringify(encryptedJSON, null, 2));

    const str = await KeyEncryption.decryptToHex(encryptedJSON, password);
    expect(str).toBe(testHex);
    console.log(str);
})

test('Encrypt invalid hex (odd length)', async () => {
    const encryptedJSON = KeyEncryption.encryptHex(testHexInvalid, password)
    expect(encryptedJSON).rejects.toThrow(Error);
})