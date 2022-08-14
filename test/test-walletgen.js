const GMD = require('../gmd-crypto')

TestWalletGen = {}
TestWalletGen.test = async () => {
    await test1();
    await test2();
    await test2b();
    await test2error();
    await test3();
    await test4();
};

test1 = async () => {
    PassPhraseGenerator = require('../pass-gen');
    let passPhrase = PassPhraseGenerator.generatePass(24);
    console.log(passPhrase);
}

test2 = async () => {
    GMD.generateAccount().then(data => {
        console.log("Generated wallet " + JSON.stringify(data, null, 2))
    }).catch(e => { console.log("Error: " + e) })
}

test2b = async () => {
    GMD.generateAccount('any random passphrase created on other system for example on ethereum network. there is no limit on the number of words').then(data => {
        console.log("Generated wallet from password " + JSON.stringify(data, null, 2))
    }).catch(e => { console.log("Error: " + e) })
}

test2error = async () => {
    let save = GMD.baseURL;
    GMD.baseURL = 'test-errors';
    GMD.generateAccount().then(data => {
        console.log("Generated wallet " + JSON.stringify(data, null, 2))
    }).catch(e => { console.log("Error: " + e) })
    GMD.baseURL = save;
}

test3 = () => {
    console.log('testing checkRSAddress');
    GMD.checkRSAddress('GMD-XRDW-5KPH-8ZQ7-65G9L').then(console.log).catch(console.log);
}

test4 = async () => {
    console.log('getBalance');
    let balance = await GMD.getBalance('GMD-43MP-76UW-L69N-ALW39');
    console.log('balance=' + balance)
}

module.exports = TestWalletGen;

