import webcrypto from './get-crypto.js';
import { curve25519 } from './curve25519.js';

import { RSAddress } from './rs-address.js'


export namespace CryptoUtil {
    export namespace Converters {
        export function strToHex(str: string): string {
            let result = '';
            strToBytes(str).forEach(c => result += c.toString(16));
            return result;
        }

        export function strToBytes(str: string): number[] {
            return Array.from(str).map(c => c.charCodeAt(0));
        }

        export function hexToString(hex: string): string {
            let string = '';
            for (let i = 0; i < hex.length; i += 2) {
                string += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            return string;
        }

        export function hexToBytes(hex: string): number[] {
            const bytes = [];
            for (let c = 0; c < hex.length; c += 2) {
                bytes.push(parseInt(hex.substr(c, 2), 16));
            }
            return bytes;
        }

        export function bytesToHex(byteArray: number[]): string {
            return Array.from(byteArray, (byte) => {
                return ('0' + (byte & 0xFF).toString(16)).slice(-2);
            }).join('')
        }

        export function strToUint8(str: string): Uint8Array {
            return new Uint8Array(strToBytes(str));
        }

        export function hexToUint8(hex: string): Uint8Array {
            return new Uint8Array(hexToBytes(hex));
        }

        export function Uint8ArrayToStr(buffer: Uint8Array): string {
            let s = '';
            for (let i = 0; i < buffer.length; i++) {
                s += String.fromCharCode(buffer[i]);
            }
            return s;
        }

        export function Uint8ArrayToHex(buffer: Uint8Array): string {
            return bytesToHex(Array.from(buffer));
        }

        export function bytesToString(bytesArray: number[]): string {
            return String.fromCharCode.apply(null, bytesArray);
        }

        export function hexToDec(hex: string): string {
            if (hex.length % 2) {
                hex = '0' + hex;
            }
            return BigInt('0x' + hex).toString(10);
        }

        export function byteArraysEqual(bytes1: number[], bytes2: number[]): boolean {
            if (bytes1.length !== bytes2.length) {
                return false;
            }
            for (let i = 0; i < bytes1.length; ++i) {
                if (bytes1[i] !== bytes2[i]) {
                    return false;
                }
            }
            return true;
        }

        export function isHex(str: string | null): boolean {
            const re = /^[0-9a-fA-F]+$/;
            return str != null && str.length > 0 && re.test(str);
        }
    }


    export namespace Crypto {
        export interface IMinWalletDetails {
            publicKey: string,
            privateKey: string
        }


        export async function SHA256(in1: number[], in2?: number[]): Promise<number[]> {
            let input: number[] = [];
            if (in1) {
                if (in2) {
                    input = in1.concat(in2);
                } else {
                    input = in1;
                }
            } else {
                if (in2) {
                    input = in2;
                }
            }

            const arrayBufferInput = Uint8Array.from(input);
            const output = await webcrypto.subtle.digest('SHA-256', arrayBufferInput);
            return Array.from(new Uint8Array(output));
        }

        export async function signBytes(message: string, passPhrase: string): Promise<string> {
            const privateKey = await getPrivateKey(passPhrase);
            return signHex(message, privateKey);
        }

        export async function signHex(message: string, privateKey: string): Promise<string> {
            const messageBytes = Converters.hexToBytes(message);
            const s = Converters.hexToBytes(privateKey);
            const m = await SHA256(messageBytes);
            const x = await SHA256(m, s);
            const y = curve25519.keygen(x).p;
            const h = await SHA256(m, y);
            const v = curve25519.sign(h, x, s);
            return Converters.bytesToHex(v ? v.concat(h) : []);
        }

        export async function getPrivateKey(pass: string): Promise<string> {
            const { privateKey } = await getWalletDetails(pass);
            return privateKey;
        }

        export async function getPublicKey(pass: string): Promise<string> {
            const { publicKey } = await getWalletDetails(pass);
            return publicKey;
        }


        export async function getWalletDetails(passPhrase: string): Promise<IMinWalletDetails> {
            const seed = await getSeed(passPhrase);
            return getWalletDetailsFromSeed(seed);
        }

        export async function getSeed(passPhrase: string): Promise<number[]> {
            return SHA256(Converters.strToBytes(passPhrase));
        }

        export async function getWalletDetailsFromSeed(seed: number[]): Promise<IMinWalletDetails> {
            const { p, s } = curve25519.keygen(seed);
            const publicKey = Converters.bytesToHex(p);
            const privateKey = Converters.bytesToHex(s);
            return { publicKey: publicKey, privateKey: privateKey }
        }

        export async function publicKeyToAccountId(publicKeyHex: string): Promise<string> {
            const sha256digest = await SHA256(Converters.hexToBytes(publicKeyHex));
            const accountIdBytes = sha256digest.slice(0, 8).reverse(); // Most siginificant byte is on the right.
            const accountId = Converters.hexToDec(Converters.bytesToHex(accountIdBytes));
            return accountId;
        }

        export async function verifySignature(signature: string, unsignedMessage: string, publicKey: string): Promise<boolean> {
            const signatureBytes = Converters.hexToBytes(signature);
            const messageBytes = Converters.hexToBytes(unsignedMessage);
            const publicKeyBytes = Converters.hexToBytes(publicKey);
            const v = signatureBytes.slice(0, 32);
            const h = signatureBytes.slice(32);
            const Y = curve25519.verify(v, h, publicKeyBytes);

            const m = await SHA256(messageBytes);
            const h2 = await SHA256(m, Y);

            return Converters.byteArraysEqual(h, h2);
        }

        export async function publicKeyToRSAccount(publicKeyHex: string): Promise<string> {
            const accountId = await publicKeyToAccountId(publicKeyHex);
            return accountIdToRS(accountId);
        }

        export function accountIdToRS(accountId: string): string {
            const rsaddr = new RSAddress();
            rsaddr.set(accountId);
            return rsaddr.toString();
        }

        export function GmdToNqt(gmd: string): string {
            const regex = /^\d*(\.\d{1,8})?$/; //maximum 8 decimals
            if (regex.test(gmd)) {
                let [n, d] = gmd.split('.');
                while (n.charAt(0) === '0') { //remove leading zeros
                    n = n.slice(1);
                }
                d = d ? d : "";
                d = d.padEnd(8, '0');
                const ret = n + d;
                return ret ? ret : '0';
            } else {
                throw new Error("Coneversion GMD to NQT error. At most 8 decimqals are supported, unsigned. GMD input=" + gmd);
            }
        }

        export function NqtToGmd(nqt: string): string {
            const regex = /^\d+$/;
            if (regex.test(nqt)) {
                if (/^0+$/.test(nqt)) {
                    return '0';
                }
                let n = '';
                let d = '';
                if (nqt.length <= 8) {
                    d = nqt.padStart(8, '0');
                } else {
                    n = nqt.slice(0, -8);
                    d = nqt.slice(-8);
                }
                n = n.replace(/^0+/, ""); //remove leading zeros
                d = d.replace(/0+$/, ""); //remove trailing decimal zeros

                return (n ? n : '0') + (d ? '.' + d : '');
            }
            else {
                throw new Error("Coneversion NQT to GMD error. Invalid input=" + nqt);
            }
        }
    }

}