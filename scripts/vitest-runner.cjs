const { spawnSync } = require("child_process");
const path = require("path");

const vitestPath = "node_modules/vitest/vitest.mjs";
const preloadPath = path.join(__dirname, "crypto-preload.cjs");
const args = ["-r", preloadPath, vitestPath, ...process.argv.slice(2)];

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
