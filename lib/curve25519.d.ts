export namespace curve25519 {
    export { sign };
    export { verify };
    export { keygen };
}
/********* DIGITAL SIGNATURES *********/
declare function sign(h: number[], x: number[], s: number[]): number[] | undefined;
declare function verify(v: number[], h: number[], P: number[]): number[];
declare function keygen(k: number[]): {
    p: number[];
    s: number[];
    k: number[];
};
export { };
