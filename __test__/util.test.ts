import {CryptoUtil} from '../dist/crypto-util.js';

describe('Check validity of RS address', () => {
    const addr = 'GMD-43MP-76UW-L69N-ALW39';

    const validRSArray = [
        'GMD-43MP-76UW-L69N-ALW39',
        '43MP-76UW-L69N-ALW39',
        'gmd-43Mp-76Uw-l69N-aLW39',
        '-43mp-76uw-l69n-alw39',
    ]

    const invalidRSNoRecoverArray = [
        'GMD-AAAA-AAAA-AAAA-AAAAA',
        'GM-43MP-76UW-L69N-ALW39',
        'GMD-76UW-L69N-ALW39',
        'some invalid string'
    ];

    const invalidRSRecoverArray = [
        'GMD-43MP-76UW-L69N-ALW38',
        'GMD-43MP-76UW-L69N-ALW3',
        'GMD-43MP-76UW-L69N-ALW30',
        'GMD-43MP-76UW-L69N-ALWAA',
        'GMD-W3MP-76UW-L69N-ALW3A',
        'W3MP-76UW-L69N-ALW3A',
        '-43MP-76UW-L69N-ALW38',
    ]

    test('Util isValidRs', ()=>{
        for( let rs of validRSArray ) {
            expect(CryptoUtil.Crypto.isValidRS(rs)).toBe(true);
        }
    })

    test('Util not ValidRs', ()=>{
        for( let rs of invalidRSNoRecoverArray.concat(invalidRSRecoverArray) ) {
            expect(CryptoUtil.Crypto.isValidRS(rs)).toBe(false);
        }
    })

    test('Is valid RS with suggestion, valid case', ()=>{
        for( let rs of validRSArray ) {
            const r = CryptoUtil.Crypto.isValidRSWithSuggestions(rs);
            expect(r.valid).toBe(true);
            expect(r.suggestions.length).toBe(0);
        }
    })

    test('Is valid RS with suggestion, invalid case, no recovery', ()=>{
        for( let rs of invalidRSNoRecoverArray) {
            const r = CryptoUtil.Crypto.isValidRSWithSuggestions(rs);
            expect(r.valid).toBe(false);
            expect(r.suggestions.length).toBe(0);
        }
    })

    test('Is valid RS with suggestion, invalid case, recovery. Max 2 errors for correction', ()=>{
        for( let rs of invalidRSRecoverArray) {
            const r = CryptoUtil.Crypto.isValidRSWithSuggestions(rs);
            expect(r.valid).toBe(false);
            expect(r.suggestions.length).toBe(1);
            expect(r.suggestions[0]).toBe(addr);
            console.log('isValidRSWithSuggestions() input=',rs,'suggestions=',r.suggestions);    
        }
    })
});

describe('Check conversion of GMD to NQT and NQT to GMD', () => {
    test('GMD to NQT', ()=>{
        const gmd = "1";
        const nqt = "100000000";
        expect(CryptoUtil.Crypto.GmdToNqt(gmd)).toBe(nqt);
    });

    test('NQT to GMD', ()=>{
        const gmd = "1";
        const nqt = "100000000";
        expect(CryptoUtil.Crypto.NqtToGmd(nqt)).toBe(gmd);
    });

    test('NQT to GMD, 0', ()=>{
        const gmd = "0";
        const nqt = "0";
        expect(CryptoUtil.Crypto.NqtToGmd(nqt)).toBe(gmd);
    });

    test('NQT to GMD, 0.1', ()=>{
        const gmd = "0.1";
        const nqt = "10000000";
        expect(CryptoUtil.Crypto.NqtToGmd(nqt)).toBe(gmd);
    });

    test('NQT to GMD, 0.00000001', ()=>{
        const gmd = "0.00000001";
        const nqt = "1";
        expect(CryptoUtil.Crypto.NqtToGmd(nqt)).toBe(gmd);
    });

    test('GMD to NQT, 00.00100000', ()=>{
        const gmd = "0.00100000";
        const nqt = "100000";
        expect(CryptoUtil.Crypto.GmdToNqt(gmd)).toBe(nqt);
    });
});

describe('Hex to dec',()=>{
    test('Hex to dec', ()=>{
        const hex = "0x100";
        const dec = "256";
        expect(CryptoUtil.Converters.hexToDec(hex)).toBe(dec);
    });

    test('Hex to dec, 0x0', ()=>{
        const hex = "0x0";
        const dec = "0";
        expect(CryptoUtil.Converters.hexToDec(hex)).toBe(dec);
    });

    test('Hex to dec, very long hex', ()=>{
        const hex = "0x11111111111111111111111111121112112222233333445434455666666678890000000aaaabbbccccccdddddeeeeeeefffff11111111111111111111111111121112112222233333445434455666666678890000000aaaabbbccccccdddddeeeeeeefffff";
        const dec = CryptoUtil.Converters.hexToDec(hex);
        expect(dec).toBe('113800779654482846277629470561643128501448818354444180756503300311598180531997298040089569368412873193965435251365129889344807719543246410380241438260168908691021454965767882478203205878978897850869229004124055914555353885249793036170531176447');
    });
});