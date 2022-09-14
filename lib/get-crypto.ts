/* eslint @typescript-eslint/no-var-requires: "off" */
import { webcrypto } from "crypto" //Node equivalent of window.crypto in browser
let cryptoExport: webcrypto.Crypto;
if (webcrypto == undefined && window !== undefined) {
    cryptoExport = window.crypto as webcrypto.Crypto;
} else {
    cryptoExport = webcrypto;
}
export default cryptoExport 
