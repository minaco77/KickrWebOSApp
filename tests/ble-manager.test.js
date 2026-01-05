import { describe, it, expect, vi } from "vitest";

async function loadExports() {
  await import("../main.js");
  return globalThis.__kickrTestExports;
}

function createServiceStub() {
  const calls = [];
  const request = (uri, opts) => {
    calls.push({ uri, method: opts.method, parameters: opts.parameters });
    if (opts.method === "isEnabled") {
      opts.onSuccess?.({ isEnabled: true });
    }
    if (opts.method === "startScan") {
      opts.onSuccess?.({
        devices: [{ name: "KICKR CORE", address: "AA:BB:CC:DD" }]
      });
    }
    if (opts.method === "stopScan") {
      opts.onSuccess?.({ returnValue: true });
    }
    if (opts.method === "client/connect") {
      opts.onSuccess?.({
        event: "onConnectionStateChange",
        values: { connected: true }
      });
    }
    return { cancel: vi.fn() };
  };
  return { request, calls };
}

describe("BLEManager", () => {
  it("scans and connects to the target device", async () => {
    vi.resetModules();
    const { BLEManager } = await loadExports();
    const ui = { log: vi.fn() };
    const { request, calls } = createServiceStub();
    const ble = new BLEManager(ui, request);

    ble.checkBleEnabled();

    expect(ble.targetAddress).toBe("AA:BB:CC:DD");
    expect(calls.map((c) => c.method)).toEqual([
      "isEnabled",
      "startScan",
      "client/connect"
    ]);
  });
});
