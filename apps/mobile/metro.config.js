// Metro config so the standalone Expo app can consume the shared source in
// `packages/core` (@sunoflow/core). It's installed as a `link:` dependency
// (symlink in node_modules), so Metro resolves it normally — we just need to
// (1) watch the linked source so it's transformed + hot-reloaded, and (2) let
// resolution fall back to the repo-root node_modules for core's own deps (zod).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");
const coreDir = path.resolve(repoRoot, "packages/core");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [coreDir];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

module.exports = config;
