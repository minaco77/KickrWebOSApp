if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
  try {
    const { randomFillSync, webcrypto } = require("crypto");
    if (webcrypto && typeof webcrypto.getRandomValues === "function") {
      globalThis.crypto = webcrypto;
    } else {
      globalThis.crypto = {
        getRandomValues(typedArray) {
          if (!typedArray || typeof typedArray.byteLength !== "number") {
            throw new TypeError("Expected a typed array");
          }
          return randomFillSync(typedArray);
        }
      };
    }
  } catch (err) {
    // If crypto isn't available, Vitest/Vite will fail with a clear error.
  }
}
