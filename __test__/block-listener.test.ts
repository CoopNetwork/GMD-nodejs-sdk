import { Provider, IBlockListener } from '../dist/index.js';
import { test } from '@jest/globals';

let provider = new Provider(new URL('https://ccone.asiminei.com:6877'));

jest.setTimeout(6000000);

test.skip('Wait new block', async () => {
    const listener = new class implements IBlockListener {
        onBlock(height: number, oldBlockHeight: number) {
            console.log('New block', height, "old block", oldBlockHeight);
        }
        onNodeHealthChange(healthy: boolean) {
            console.log('Node health', healthy);
        }
    }
    provider.addBlockListener(listener);
    // await new Promise(r => setTimeout(r, 120000));
    // provider.removeBlockListener(listener);
    await new Promise(r => setTimeout(r, 120000000));
});