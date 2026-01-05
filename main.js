/* global webOS */
const IS_WEBOS = typeof window.webOS !== "undefined";
const IS_SIMULATOR = !IS_WEBOS;
const TARGET_NAME_SUBSTRING = "KICKR";

// ============================================================================
// UI Controller - manages DOM elements and user feedback
// ============================================================================
class UIController {
  constructor() {
    this.logEl = document.getElementById("log");
  }

  log(msg) {
    console.log(msg);
    if (this.logEl) {
      this.logEl.textContent += msg + "\n";
    }
  }

  $(id) {
    return document.getElementById(id);
  }

  setButtonConnected(isConnected) {
    const btn = this.$("connectBtn");
    if (!btn) {
      this.log("Connect button not found in DOM.");
      return;
    }
    btn.textContent = isConnected ? "Disconnect" : "Connect to KICKR";
    btn.setAttribute("aria-pressed", String(isConnected));
  }

  setStatus(msg) {
    const el = this.$("status");
    if (el) el.textContent = msg;
    this.log(msg);
  }

  setStats(powerText, cadenceText) {
    const p = this.$("power");
    const c = this.$("cadence");
    if (p) p.textContent = powerText;
    if (c) c.textContent = cadenceText;
  }
}

// ============================================================================
// BLE Manager - handles BLE service requests
// ============================================================================
class BLEManager {
  constructor(uiController) {
    this.ui = uiController;
    this.scanHandle = null;
    this.connectHandle = null;
    this.targetAddress = null;
  }

  checkBleEnabled() {
    this.ui.log("Checking BLE state...");

    webOS.service.request("luna://com.webos.service.blegatt", {
      method: "isEnabled",
      parameters: { subscribe: true },
      onSuccess: (res) => {
        this.ui.log("isEnabled result: " + JSON.stringify(res));
        if (res.isEnabled === true) {
          if (typeof this.cancel === "function") this.cancel();
          this.startScan();
        } else {
          this.ui.log("BLE is disabled or unavailable on this TV.");
        }
      },
      onFailure: (err) => {
        this.ui.log("isEnabled error: [" + err.errorCode + "] " + err.errorText);
      }
    });
  }

  startScan() {
    this.ui.log("Starting BLE scan...");

    this.scanHandle = webOS.service.request("luna://com.webos.service.blegatt", {
      method: "startScan",
      parameters: { subscribe: true },
      onSuccess: (res) => {
        this.ui.log("scan event: " + JSON.stringify(res));

        if (!res.devices) return;

        for (let d of res.devices) {
          const name = d.name || "";
          const address = d.address;

          if (name.toUpperCase().includes(TARGET_NAME_SUBSTRING)) {
            this.ui.log(`Found target device: ${name} (${address})`);
            this.targetAddress = address;
            this.stopScan();
            this.connectToTarget();
            break;
          }
        }
      },
      onFailure: (err) => {
        this.ui.log("startScan error: [" + err.errorCode + "] " + err.errorText);
      }
    });
  }

  stopScan() {
    if (!this.scanHandle) return;

    webOS.service.request("luna://com.webos.service.blegatt", {
      method: "stopScan",
      parameters: {},
      onSuccess: (res) => {
        this.ui.log("Stopped scan: " + JSON.stringify(res));
      },
      onFailure: (err) => {
        this.ui.log("stopScan error: [" + err.errorCode + "] " + err.errorText);
      }
    });

    if (typeof this.scanHandle.cancel === "function") {
      this.scanHandle.cancel();
    }
    this.scanHandle = null;
  }

  connectToTarget() {
    if (!this.targetAddress) {
      this.ui.log("No targetAddress set; cannot connect.");
      return;
    }

    this.ui.log("Connecting to " + this.targetAddress + "...");

    this.connectHandle = webOS.service.request("luna://com.webos.service.blegatt", {
      method: "client/connect",
      parameters: {
        subscribe: true,
        address: this.targetAddress
      },
      onSuccess: (res) => {
        this.ui.log("GATT event: " + JSON.stringify(res));
        return res;
      },
      onFailure: (err) => {
        this.ui.log("connect error: [" + err.errorCode + "] " + err.errorText);
      }
    });
  }

  disconnect() {
    if (this.connectHandle && typeof this.connectHandle.cancel === "function") {
      this.connectHandle.cancel();
    }
    if (this.scanHandle && typeof this.scanHandle.cancel === "function") {
      this.scanHandle.cancel();
    }
    this.connectHandle = null;
    this.scanHandle = null;
    this.targetAddress = null;
  }
}

// ============================================================================
// GATT Event Handler - processes GATT service events
// ============================================================================
class GATTEventHandler {
  constructor(uiController) {
    this.ui = uiController;
  }

  handle(res) {
    const event = res.event;
    const values = res.values;

    if (event === "onConnectionStateChange") {
      this.handleConnectionStateChange(values);
    } else if (event === "onServicesDiscovered") {
      this.handleServicesDiscovered();
    } else if (event === "onCharacteristicChanged") {
      this.handleCharacteristicChanged(values);
    }
  }

  handleConnectionStateChange(values) {
    if (values && values.connected) {
      this.ui.log("KICKR connected!");
    } else {
      this.ui.log("KICKR disconnected.");
    }
  }

  handleServicesDiscovered() {
    this.ui.log("Services discovered. (TODO: parse services & characteristics)");
  }

  handleCharacteristicChanged(values) {
    this.ui.log("Characteristic changed: " + JSON.stringify(values));
  }
}

// ============================================================================
// Simulator Mode - generates mock trainer data
// ============================================================================
class SimulatorMode {
  constructor(uiController) {
    this.ui = uiController;
    this.simIntervalId = null;
  }

  start() {
    this.ui.log("Simulator detected; starting mock data generation.");
    let t = 0;
    this.simIntervalId = setInterval(() => {
      t += 1;
      const power = 140 + Math.random() * 100;
      const cadence = 78 + Math.random() * 100;
      this.ui.setStats(`${power.toFixed(0)} W`, `${cadence.toFixed(0)} rpm`);
    }, 500);
  }

  stop() {
    if (this.simIntervalId) {
      this.ui.log("Stopping simulator...");
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
    this.ui.setStats('--', '--');
  }
}

// ============================================================================
// Kickr Controller - main orchestrator
// ============================================================================
class KickrController {
  constructor() {
    this.ui = new UIController();
    this.bleManager = new BLEManager(this.ui);
    this.gattHandler = new GATTEventHandler(this.ui);
    this.simulator = new SimulatorMode(this.ui);
    this.isConnected = false;
  }

  connect() {
    if (this.isConnected) {
      this.ui.log("Already connecting or connected.");
      return;
    }

    this.isConnected = true;
    this.ui.setButtonConnected(true);
    this.ui.setStatus("Connecting...");

    if (IS_SIMULATOR) {
      this.ui.log("Simulator detected; skipping BLE initialization.");
      this.simulator.start();
      return;
    }

    this.bleManager.checkBleEnabled();
  }

  disconnect() {
    if (!this.isConnected) {
      this.ui.log("Not currently connected.");
      return;
    }

    this.isConnected = false;
    this.ui.setButtonConnected(false);
    this.ui.setStatus("Disconnected");

    if (IS_SIMULATOR) {
      this.simulator.stop();
      this.ui.setStatus("Disconnecting...");
      return;
    }

    this.bleManager.disconnect();
  }

  toggleConnection() {
    if (this.isConnected) {
      this.disconnect();
    } else {
      this.connect();
    }
  }

  handleGattEvent(res) {
    this.gattHandler.handle(res);
  }
}

// ============================================================================
// Initialize app
// ============================================================================
const kickrApp = new KickrController();

window.addEventListener("load", () => {
  kickrApp.ui.setButtonConnected(false);
  kickrApp.ui.setStatus("Press Connect");
  kickrApp.ui.setStats("--", "--");
  document.getElementById("connectBtn").addEventListener("click", () => {
    kickrApp.toggleConnection();
  });
});