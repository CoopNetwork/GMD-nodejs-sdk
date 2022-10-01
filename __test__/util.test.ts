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