/*
    NXT address class, extended version (with error guessing).

    Version: 1.0, license: Public Domain, coder: NxtChg (admin@nxtchg.com).
*/

export class RSAddress {
    codeword = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    syndrome = [0, 0, 0, 0, 0];

    gexp = [1, 2, 4, 8, 16, 5, 10, 20, 13, 26, 17, 7, 14, 28, 29, 31, 27, 19, 3, 6, 12, 24, 21, 15, 30, 25, 23, 11, 22, 9, 18, 1];
    glog = [0, 0, 1, 18, 2, 5, 19, 11, 3, 29, 6, 27, 20, 8, 12, 23, 4, 10, 30, 17, 7, 22, 28, 26, 21, 25, 9, 16, 13, 14, 24, 15];

    cwmap = [3, 2, 1, 0, 7, 6, 5, 4, 13, 14, 15, 16, 12, 8, 9, 10, 11];

    alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    //var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ345679';

    guess: string[] = [];

    ginv(a: any) {
        return this.gexp[31 - this.glog[a]];
    }

    gmult(a: any, b: any) {
        if (a == 0 || b == 0) return 0;

        var idx = (this.glog[a] + this.glog[b]) % 31;

        return this.gexp[idx];
    } //__________________________

    calc_discrepancy(lambda: any, r: any) {
        var discr = 0;

        for (var i = 0; i < r; i++) {
            discr ^= this.gmult(lambda[i], this.syndrome[r - i]);
        }

        return discr;
    } //__________________________

    find_errors(lambda: any) {
        var errloc = [];

        for (var i = 1; i <= 31; i++) {
            var sum = 0;

            for (var j = 0; j < 5; j++) {
                sum ^= this.gmult(this.gexp[(j * i) % 31], lambda[j]);
            }

            if (sum == 0) {
                var pos = 31 - i;
                if (pos > 12 && pos < 27) return [];

                errloc[errloc.length] = pos;
            }
        }

        return errloc;
    } //__________________________

    guess_errors() {
        var el = 0,
            b = [0, 0, 0, 0, 0],
            t = [];

        var deg_lambda = 0,
            lambda = [1, 0, 0, 0, 0]; // error+erasure locator poly

        // Berlekamp-Massey algorithm to determine error+erasure locator polynomial

        for (var r = 0; r < 4; r++) {
            var discr = this.calc_discrepancy(lambda, r + 1); // Compute discrepancy at the r-th step in poly-form

            if (discr != 0) {
                deg_lambda = 0;

                for (var i = 0; i < 5; i++) {
                    t[i] = lambda[i] ^ this.gmult(discr, b[i]);

                    if (t[i]) deg_lambda = i;
                }

                if (2 * el <= r) {
                    el = r + 1 - el;

                    for (i = 0; i < 5; i++) {
                        b[i] = this.gmult(lambda[i], this.ginv(discr));
                    }
                }

                lambda = t.slice(); // copy
            }

            b.unshift(0); // shift => mul by x
        }

        // Find roots of the locator polynomial.

        var errloc = this.find_errors(lambda);

        var errors = errloc.length;

        if (errors < 1 || errors > 2) return false;

        if (deg_lambda != errors) return false; // deg(lambda) unequal to number of roots => uncorrectable error

        // Compute err+eras evaluator poly omega(x) = s(x)*lambda(x) (modulo x**(4)). Also find deg(omega).

        var omega = [0, 0, 0, 0, 0];

        for (let i = 0; i < 4; i++) {
            let t = 0;

            for (var j = 0; j < i; j++) {
                t ^= this.gmult(this.syndrome[i + 1 - j], lambda[j]);
            }

            omega[i] = t;
        }

        // Compute error values in poly-form.

        for (r = 0; r < errors; r++) {
            let t = 0;
            var pos = errloc[r];
            var root = 31 - pos;

            for (i = 0; i < 4; i++) // evaluate Omega at alpha^(-i)
            {
                t ^= this.gmult(omega[i], this.gexp[(root * i) % 31]);
            }

            if (t) // evaluate Lambda' (derivative) at alpha^(-i); all odd powers disappear
            {
                var denom = this.gmult(lambda[1], 1) ^ this.gmult(lambda[3], this.gexp[(root * 2) % 31]);

                if (denom == 0) return false;

                if (pos > 12) pos -= 14;

                this.codeword[pos] ^= this.gmult(t, this.ginv(denom));
            }
        }

        return true;
    } //__________________________

    encode() {
        var p = [0, 0, 0, 0];

        for (var i = 12; i >= 0; i--) {
            var fb = this.codeword[i] ^ p[3];

            p[3] = p[2] ^ this.gmult(30, fb);
            p[2] = p[1] ^ this.gmult(6, fb);
            p[1] = p[0] ^ this.gmult(9, fb);
            p[0] = this.gmult(17, fb);
        }

        this.codeword[13] = p[0];
        this.codeword[14] = p[1];
        this.codeword[15] = p[2];
        this.codeword[16] = p[3];
    } //__________________________

    reset() {
        for (var i = 0; i < 17; i++) this.codeword[i] = 1;
    } //__________________________

    set_codeword(cw: any, len?: any, skip?: any) {
        if (typeof len === 'undefined') len = 17;
        if (typeof skip === 'undefined') skip = -1;

        for (var i = 0, j = 0; i < len; i++) {
            if (i != skip) this.codeword[this.cwmap[j++]] = cw[i];
        }
    } //__________________________

    add_guess() {
        var s = this.toString(),
            len = this.guess.length;

        if (len > 2) return;

        for (var i = 0; i < len; i++) {
            if (this.guess[i] == s) return;
        }

        this.guess[len] = s;
    } //__________________________

    ok() {
        var sum = 0;

        for (var i = 1; i < 5; i++) {
            for (var j = 0, t = 0; j < 31; j++) {
                if (j > 12 && j < 27) continue;

                var pos = j;
                if (j > 26) pos -= 14;

                t ^= this.gmult(this.codeword[pos], this.gexp[(i * j) % 31]);
            }

            sum |= t;
            this.syndrome[i] = t;
        }

        return (sum == 0);
    } //__________________________

    from_acc(acc: any) {
        var inp = [],
            out = [],
            pos = 0,
            len = acc.length;

        if (len == 20 && acc.charAt(0) != '1') return false;

        for (var i = 0; i < len; i++) {
            inp[i] = acc.charCodeAt(i) - '0'.charCodeAt(0);
        }

        do // base 10 to base 32 conversion
        {
            var divide = 0,
                newlen = 0;

            for (i = 0; i < len; i++) {
                divide = divide * 10 + inp[i];

                if (divide >= 32) {
                    inp[newlen++] = divide >> 5;
                    divide &= 31;
                } else if (newlen > 0) {
                    inp[newlen++] = 0;
                }
            }

            len = newlen;
            out[pos++] = divide;
        }
        while (newlen);

        for (i = 0; i < 13; i++) // copy to codeword in reverse, pad with 0's
        {
            this.codeword[i] = (--pos >= 0 ? out[i] : 0);
        }

        this.encode();

        return true;
    } //__________________________

    toString() {
        var out = "GMD-";

        for (var i = 0; i < 17; i++) {
            out += this.alphabet[this.codeword[this.cwmap[i]]];

            if ((i & 3) == 3 && i < 13) out += '-';
        }

        return out;
    } //__________________________

    account_id() {
        var out = '',
            inp = [],
            len = 13;

        for (var i = 0; i < 13; i++) {
            inp[i] = this.codeword[12 - i];
        }

        do // base 32 to base 10 conversion
        {
            var divide = 0,
                newlen = 0;

            for (i = 0; i < len; i++) {
                divide = divide * 32 + inp[i];

                if (divide >= 10) {
                    inp[newlen++] = Math.floor(divide / 10);
                    divide %= 10;
                } else if (newlen > 0) {
                    inp[newlen++] = 0;
                }
            }

            len = newlen;
            out += String.fromCharCode(divide + '0'.charCodeAt(0));
        }
        while (newlen);

        return out.split("").reverse().join("");
    } //__________________________

    set(adr: string, allow_accounts?: any) {
        if (typeof allow_accounts === 'undefined') allow_accounts = true;

        var len = 0;
        this.guess = [];
        this.reset();

        adr = String(adr);

        adr = adr.replace(/(^\s+)|(\s+$)/g, '').toUpperCase();

        if (adr.indexOf("GMD-") == 0) adr = adr.substr(4);

        if (adr.match(/^\d{1,20}$/g)) // account id
        {
            if (allow_accounts) return this.from_acc(adr);
        } else // address
        {
            let clean = [];

            for (var i = 0; i < adr.length; i++) {
                var pos = this.alphabet.indexOf(adr[i]);

                if (pos >= 0) {
                    clean[len++] = pos;
                    if (len > 18) return false;
                }
            }
        }
        let clean: any[] = [];
        if (len == 16) // guess deletion
        {
            for (let i = 16; i >= 0; i--) {
                for (var j = 0; j < 32; j++) {
                    clean[i] = j;

                    this.set_codeword(clean);

                    if (this.ok()) this.add_guess();
                }

                if (i > 0) {
                    let t = clean[i - 1];
                    clean[i - 1] = clean[i];
                    clean[i] = t;
                }
            }
        }

        if (len == 18) // guess insertion
        {
            for (let i = 0; i < 18; i++) {
                this.set_codeword(clean, 18, i);

                if (this.ok()) this.add_guess();
            }
        }

        if (len == 17) {
            this.set_codeword(clean);

            if (this.ok()) return true;

            if (this.guess_errors() && this.ok()) this.add_guess();
        }

        this.reset();

        return false;
    }
}

export default RSAddress;