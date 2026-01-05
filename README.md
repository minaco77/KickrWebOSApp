# webOS TV 24 KICKR PoC

Minimal webOS TV web app (HTML/CSS/JS) that connects to a Wahoo KICKR via BLE on device, with simulator-mode data for local UI testing.
This app is developed on an LG TV with WebOS 24.  It may not work on other platform (but you're welcome to try it out there, feed back on what does and does not work on other TVs would be great).

## Requirements

- webOS CLI (`ares-*`) installed and on `PATH`
- Node.js 16.x
- webOS TV 24 Simulator and/or a real LG TV

###  Reccomended for devlopment work
- VS Code with the WebOS Studio extension installed

## Project Layout

- `index.html`, `styles.css`, `main.js` - app UI and logic
- `appinfo.json` - app metadata and permissions
- `scripts/deploy.ps1` - packaging + deploy automation

## Run in Simulator

The app auto-detects simulator mode when `window.webOS` is missing and generates mock power/cadence data.

## Deploy (Simulator + TV)

From the project root:

```powershell
.\scripts\deploy.ps1 -Target all
```

Simulator only:

```powershell
.\scripts\deploy.ps1 -Target simulator
```

TV only:

```powershell
.\scripts\deploy.ps1 -Target tv
```

Custom simulator path or version:

```powershell
.\scripts\deploy.ps1 -Target simulator -SimulatorVersion 24 -SimulatorPath "C:\path\to\webOS_TV_24_Simulator"
```

If your device names differ from defaults, pass them explicitly:

```powershell
.\scripts\deploy.ps1 -Target all -DeviceTv <yourTvName>
```

## Tests (Vitest)

Install dependencies and run CI-style tests:

```powershell
npm install
npm run test:ci
```

Watch mode:

```powershell
npm run test:watch
```

Tests mock the webOS BLE service so you can validate logic without a TV.

## Notes

- BLE uses the Luna service `luna://com.webos.service.blegatt`.
- Required permission is set in `appinfo.json` (`access_bluetooth`).
- CI deploys require a self-hosted runner with webOS CLI + simulator/TV access.
- This has only been tested on an LG WebOS 24 TV with a Wahoo Kickr Core (2018 model).
