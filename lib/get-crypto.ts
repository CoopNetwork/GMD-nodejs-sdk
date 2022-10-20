function getGlobal() {
    if (isNode()) {
      let pname = "";
      const x = ["cry", "pto"];
      for (let i = 0; i < x.length; ++i) {
        pname += x[i];
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(pname).webcrypto;
    }
    if (typeof self !== "undefined") {
      return self.crypto;
    }
    if (typeof window !== "undefined") {
      return window.crypto;
    }
    if (typeof global !== "undefined") {
      return global.crypto;
    }
    throw new Error("unable to locate global object");
  }
  function isNode() {
    return typeof process !== "undefined" && process.release?.name === "node";
  }
  const crypto = getGlobal();
  export default crypto;