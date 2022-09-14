import { expect, test } from '@jest/globals';
import { CryptoUtil } from '../dist';

const sigRegex = /^[0-9a-fA-F]{128}$/;

test('Arbitrary message signing', async () => {
    const message = 'some arbitrary message';
    const messageHex = CryptoUtil.Converters.strToHex(message);
    const { publicKey, privateKey } = await CryptoUtil.Crypto.getWalletDetails('this is a passphrase example');
    const signature = await CryptoUtil.Crypto.signHex(messageHex, privateKey);
    expect(signature).toMatch(sigRegex);

    const result = await CryptoUtil.Crypto.verifySignature(signature, messageHex, publicKey);
    expect(result).toBe(true);
});