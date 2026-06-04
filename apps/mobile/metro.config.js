// Metro config so the standalone Expo app can consume the shared, framework-
// agnostic source in `packages/core` (@sunoflow/core) WITHOUT making apps/mobile
// a pnpm workspace member (that isolation keeps the RN dep tree out of the server
// lockfile + Docker image). We point the alias straight at the package source and
// add it to watchFolders so Metro transforms + hot-reloads it.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");
const coreDir = path.resolve(repoRoot, "packages/core");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [coreDir];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@sunoflow/core": coreDir,
};
// Keep resolving the app's own deps from apps/mobile/node_modules only.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
