/* global webOS */
const IS_WEBOS = typeof window.webOS !== "undefined";
const IS_SIMULATOR = !IS_WEBOS;

const TARGET_NAME_SUBSTRING = "KICKR";   // simple name filter for now
let targetAddress = null;
let connectHandle = null;
let scanHandle = null;
let isConnected = false;
let simIntervalId = null;

function log(msg) {
  console.log(msg);
  const logEl = document.getElementById("log");
  if (logEl) {
    logEl.textContent += msg + "\n";
  }
}

// --- 1. Check BLE is enabled -----------------------------------------

function checkBleEnabled() {
  log("Checking BLE state...");

  webOS.service.request("luna://com.webos.service.blegatt", {
    method: "isEnabled",
    parameters: { subscribe: true },
    onSuccess: function (res) {
      log("isEnabled result: " + JSON.stringify(res));

      if (res.isEnabled === true) {
        // Stop subscribing once we know it's enabled
        if (typeof this.cancel === "function") this.cancel();
        startScan();
      } else {
        log("BLE is disabled or unavailable on this TV.");
      }
    },
    onFailure: function (err) {
      log("isEnabled error: [" + err.errorCode + "] " + err.errorText);
    }
  });
}

// --- 2. Scan for BLE devices ----------------------------------------

function stopScan() {
  if (!scanHandle) return;

  webOS.service.request("luna://com.webos.service.blegatt", {
    method: "stopScan",
    parameters: {},
    onSuccess: function (res) {
      log("Stopped scan: " + JSON.stringify(res));
    },
    onFailure: function (err) {
      log("stopScan error: [" + err.errorCode + "] " + err.errorText);
    }
  });

  if (typeof scanHandle.cancel === "function") {
    scanHandle.cancel();
  }
  scanHandle = null;
}

function startScan() {
  log("Starting BLE scan...");

  scanHandle = webOS.service.request("luna://com.webos.service.blegatt", {
    method: "startScan",  //startScan error: [0] This is unknown error
    parameters: {
      subscribe: true
      // You *could* add a UUID filter here once you know the KICKR's GATT service UUIDs
      // uuid: ["1826"] // example for FTMS, if the device exposes it
    },
    onSuccess: function (res) {
      log("scan event: " + JSON.stringify(res));

      if (!res.devices) return;

      for (let d of res.devices) {
        const name = d.name || "";
        const address = d.address;

        if (name.toUpperCase().includes(TARGET_NAME_SUBSTRING)) {
          log(`Found target device: ${name} (${address})`);
          targetAddress = address;

          // stop scanning once we find our target
          stopScan();
          connectToTarget();
          break;
        }
      }
    },
    onFailure: function (err) {
      log("startScan error: [" + err.errorCode + "] " + err.errorText);
    }
  });
}

// --- 3. Connect & handle GATT events --------------------------------

function connectToTarget() {
  if (!targetAddress) {
    log("No targetAddress set; cannot connect.");
    return;
  }

  log("Connecting to " + targetAddress + "...");

  connectHandle = webOS.service.request("luna://com.webos.service.blegatt", {
    method: "client/connect",
    parameters: {
      subscribe: true,
      address: targetAddress
    },
    onSuccess: function (res) {
      log("GATT event: " + JSON.stringify(res));
      handleGattEvent(res);
    },
    onFailure: function (err) {
      log("connect error: [" + err.errorCode + "] " + err.errorText);
    }
  });
}

function handleGattEvent(res) {
  const event = res.event;
  const values = res.values; // note: docs sometimes use "vales" typo, check actual payload

  if (event === "onConnectionStateChange") {
    if (values && values.connected) {
      log("KICKR connected!");
      // Next steps:
      // 1. discoverServices()
      // 2. getServices()
      // 3. setCharacteristicNotification() for power/cadence characteristic(s)
    } else {
      log("KICKR disconnected.");
    }
  } else if (event === "onServicesDiscovered") {
    log("Services discovered. (TODO: parse services & characteristics)");
  } else if (event === "onCharacteristicChanged") {
    log("Characteristic changed: " + JSON.stringify(values));
    // TODO: decode the bytes into watts / cadence and update your on-screen stats UI
  }
}

// --- 4. Kick everything off when the app loads ----------------------

function connectKickr()
{
  if(!isConnected)
  {
    isConnected = true;
    setButtonConnected(true);
    setStatus("Connecting...");
  
  if(IS_SIMULATOR)
  {
    log("Simulator detected; skipping BLE initialization.");
    simulateTrainerData();
    return;
  }
    checkBleEnabled();
}
{
  //Discconnect logic
  isConnected = false;
  setButtonConnected(false);
  setStatus("Disconnected");
  if(IS_SIMULATOR)
  {
    stopSimulation();
    setStatus("Disconnecting...");
    log("Simulator detected; skipping BLE initialization.");
    return;
  }
  else
  {
    disconnectFromKickr();
  }
}

// --- helpers for simulator mode --------------------------------
function simulateTrainerData() {
  let t = 0;
  simIntervalId = setInterval(() => {
    t += 1;
    const power = 140 + Math.random() * 100;
    const cadence = 78 + Math.random() * 100;
    setStats(`${power.toFixed(0)} W`, `${cadence.toFixed(0)} rpm`);
  }, 500);
}
}

function stopSimulation() {
  if (simIntervalId) {
    clearInterval(simIntervalId);
    simIntervalId = null;
  }
  setStats('--', '--');
}

window.addEventListener("load", () => {
  setButtonConnected(false);
  setStatus("Press Connect");
  setStats("--", "--");
});

function $(id) {return document.getElementById(id);}

function setButtonConnected(isConnected) {
  const btn = $("connectBtn");
  if (!btn) 
    {
      log("Connect button not found in DOM.");
      return;
    }
  btn.textContent = isConnected ? "Disconnect" : "Connect to KICKR";
  btn.setAttribute("aria-pressed", String(isConnected));
}

function setStatus(msg) {
  const el = $("status");
  if (el) el.textContent = msg;
  console.log(msg);
}

function setStats(powerText, cadenceText) {
  const p = $("power");
  const c = $("cadence");
  if (p) p.textContent = powerText;
  if (c) c.textContent = cadenceText;
}