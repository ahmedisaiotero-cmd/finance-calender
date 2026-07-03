const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const syncIosRoot = path.resolve(__dirname, "..");
const sharedPath = path.join(syncIosRoot, "shared");
const libPath = path.join(syncIosRoot, "..", "lib");

if (!fs.existsSync(libPath)) {
  console.warn("sync-ios: parent lib/ not found — skip shared link");
  process.exit(0);
}

if (fs.existsSync(sharedPath)) {
  process.exit(0);
}

if (process.platform === "win32") {
  execSync(`cmd /c mklink /J "${sharedPath}" "${libPath}"`, {
    stdio: "inherit",
  });
} else {
  fs.symlinkSync(libPath, sharedPath, "dir");
}

console.log("sync-ios: linked shared -> ../lib");
