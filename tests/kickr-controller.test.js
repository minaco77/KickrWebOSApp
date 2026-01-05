import { describe, it, expect, vi, beforeEach } from "vitest";

async function loadExports() {
  await import("../main.js");
  return globalThis.__kickrTestExports;
}

function setupDom() {
  document.body.innerHTML = `
    <div id="log"></div>
    <button id="connectBtn"></button>
    <div id="status"></div>
    <span id="power"></span>
    <span id="cadence"></span>
  `;
}

describe("KickrController (simulator mode)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete globalThis.webOS;
    setupDom();
  });

  it("toggles connect/disconnect and updates UI", async () => {
    const { KickrController } = await loadExports();
    const app = new KickrController();
    app.simulator.start = vi.fn();
    app.simulator.stop = vi.fn();

    app.connect();

    expect(app.isConnected).toBe(true);
    expect(document.getElementById("connectBtn").textContent).toBe("Disconnect");
    expect(document.getElementById("status").textContent).toBe("Connecting...");
    expect(app.simulator.start).toHaveBeenCalled();

    app.disconnect();

    expect(app.isConnected).toBe(false);
    expect(document.getElementById("connectBtn").textContent).toBe("Connect to KICKR");
    expect(document.getElementById("status").textContent).toBe("Disconnecting...");
    expect(app.simulator.stop).toHaveBeenCalled();
  });
});
