const cryptoUtil = require('./crypto-util');
const webcrypto = require("./get-crypto");

const iterations = 223978;

export interface IEncryptedJSON {
    iv: string;
    salt: string;
    ciphertext: string;
}

interface ISaltIV {
    iv: Uint8Array;
    salt: Uint8Array;
}

const KeyEncryption = {
    /**
     * Encrypts message in hex format. Most common use is to encrypt private keys.
     *
     * @param {*} messageHex hex string. Most of the times this will encrypt hex string representing private and public keys.
     * If user wants to encrypt any other arbitrary message, should use KeyEncryption.encryptStr() instead.
     * messageHex should represent a whole number of bytes: i.e. an even number of hex digits. If odd number of hex digits is provided,
     * an error will be thrown. If user really wants to encrypt odd hex digits ( why!? ) he should add one 0 prefix padding.
     * @param {*} password password. It is recommented to be at minimum 8 chars, have numbers, both capital and lower case and special
     * characters, but this is not enforced in this SDK.
     * @returns a promise that resolves to an encrypted JSON. JSON contains: iv, salt, ciphertext.
     */
    async encryptHex(messageHex: string, password: string): Promise<IEncryptedJSON> {
        if (messageHex && messageHex.length % 2) {
            throw new Error('Hex string to be encrypted cannot have a 0 length or have an even number of hex digits');
        }
        return this.encryptBytes(cryptoUtil.hexToBytes(messageHex), password);
    },

    /**
     * Same as  KeyEncryption.encryptHex() but it encrypts any string,
     * @param {*} message any string to be encrypted.
     * @param {*} password same as KeyEncryption.encryptHex()
     * @returns a promise that resolves to an encrypted JSON. JSON contains: iv, salt, ciphertext.
     */
    async encryptStr(message: string, password: string): Promise<IEncryptedJSON> {
        return this.encryptHex(cryptoUtil.strToHex(message), password);
    },

    async encryptBytes(bytes: number[], password: string): Promise<IEncryptedJSON> {
        let { iv, salt } = await this.generateIvAndSalt();
        let encryptionKey = await this.genEncryptionKeyFromPassword(password, salt, iterations);
        let encryptedByteArray = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, encryptionKey, new Uint8Array(bytes));
        let ciphertext = cryptoUtil.Uint8ArrayToHex(new Uint8Array(encryptedByteArray));
        return { iv: cryptoUtil.Uint8ArrayToHex(iv), salt: cryptoUtil.Uint8ArrayToHex(salt), ciphertext: ciphertext };
    },

    /**
     * Helper function used to decrypt to hex. Used in pair with KeyEncryption.encryptHex() most common use case is to encrypt/decrypt private key.
     * 
     * @param {*} encryptedJSON 
     * @param {*} password 
     * @returns a promise that resolves to the unencrypted hex string.
     */
    async decryptToHex(encryptedJSON: IEncryptedJSON, password: string): Promise<string> {
        let decryptedData = await this.decrypt(encryptedJSON, password);
        return cryptoUtil.Uint8ArrayToHex(decryptedData);
    },

    /**
     * Decrypt to a string.  Used in pair with KeyEncryption.encryptStr().
     * 
     * @param {*} encryptedJSON 
     * @param {*} password 
     * @returns a promise that resolves to the unencrypted plain text UTF-16 encoded.
     */
    async decryptToStr(encryptedJSON: IEncryptedJSON, password: string): Promise<string> {
        let decryptedData = await this.decrypt(encryptedJSON, password);
        return cryptoUtil.Uint8ArrayToStr(decryptedData);
    },

    async decryptToBytes(encryptedJSON: IEncryptedJSON, password: string): Promise<number[]> {
        let result = await this.decrypt(encryptedJSON, password);
        return Array.from(result);
    },

    async decrypt(encryptedJSON: IEncryptedJSON, password: string): Promise<Uint8Array> {
        if (encryptedJSON && 'iv' in encryptedJSON && 'salt' in encryptedJSON && 'ciphertext' in encryptedJSON) {
            let ciphertext = cryptoUtil.hexToUint8(encryptedJSON.ciphertext);
            let iv = cryptoUtil.hexToUint8(encryptedJSON.iv);
            let salt = cryptoUtil.hexToUint8(encryptedJSON.salt);

            let encryptionKey = await this.genEncryptionKeyFromPassword(password, salt, iterations);
            let result = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, encryptionKey, ciphertext);
            return new Uint8Array(result);
        } else {
            throw new Error('Encrypted JSON not correct');
        }
    },

    async generateIvAndSalt(): Promise<ISaltIV> {
        let iv = webcrypto.getRandomValues(new Uint8Array(16));
        let salt = webcrypto.getRandomValues(new Uint8Array(16));
        return { iv: iv, salt: salt };
    },

    async genEncryptionKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Promise<any> {
        let importedPassword = await webcrypto.subtle.importKey(
            "raw",
            cryptoUtil.strToUint8(password),
            { "name": "PBKDF2" },
            false,
            ["deriveKey"]
        );
        return webcrypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                "salt": salt,
                "iterations": iterations,
                "hash": "SHA-256"
            },
            importedPassword,
            {
                "name": "AES-GCM",
                "length": 128
            },
            false,
            ["encrypt", "decrypt"]
        );
    }

};


export default KeyEncryption;