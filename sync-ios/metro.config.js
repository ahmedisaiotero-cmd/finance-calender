const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.blockList = [
  /node_modules[/\\]next[/\\].*/,
  /node_modules[/\\]@prisma[/\\].*/,
  /node_modules[/\\]\.prisma[/\\].*/,
  /prisma[/\\]schema\.prisma/,
];

const sourceExtensions = [
  ".ios.ts",
  ".native.ts",
  ".ts",
  ".ios.tsx",
  ".native.tsx",
  ".tsx",
  ".ios.js",
  ".native.js",
  ".js",
  ".ios.jsx",
  ".native.jsx",
  ".jsx",
  ".json",
];

function resolveAliasModule(moduleName) {
  if (!moduleName.startsWith("@/")) return null;

  const relativePath = moduleName.slice(2);
  const stem = path.join(projectRoot, ...relativePath.split("/"));

  for (const extension of sourceExtensions) {
    const candidate = `${stem}${extension}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveSharedAlias(moduleName) {
  if (!moduleName.startsWith("@shared/")) return null;

  const relativePath = moduleName.slice(9);
  const stem = path.join(projectRoot, "shared", ...relativePath.split("/"));

  for (const extension of sourceExtensions) {
    const candidate = `${stem}${extension}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const aliasPath = resolveAliasModule(moduleName) ?? resolveSharedAlias(moduleName);
  if (aliasPath) {
    return {
      type: "sourceFile",
      filePath: aliasPath,
    };
  }

  if (moduleName.startsWith("@/")) {
    const relativePath = moduleName.slice(2);
    const stem = path.join(monorepoRoot, ...relativePath.split("/"));

    for (const extension of sourceExtensions) {
      const candidate = `${stem}${extension}`;
      if (fs.existsSync(candidate)) {
        return {
          type: "sourceFile",
          filePath: candidate,
        };
      }
    }
  }

  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
