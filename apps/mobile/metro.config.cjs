const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));
config.resolver.nodeModulesPaths = Array.from(new Set([
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
  ...(config.resolver.nodeModulesPaths ?? [])
]));
const artifactBlockList = [
  /[/\\]\.pytest-tmp[/\\].*/,
  /[/\\]\.pytest_cache[/\\].*/,
  /[/\\]\.ruff_cache[/\\].*/,
  /[/\\]\.uv-cache[/\\].*/,
  /[/\\]\.venv[/\\].*/,
  /[/\\]\.local[/\\]pytest-temp[^/\\]*[/\\].*/,
  /[/\\]\.local[/\\]pytest-tmp[/\\].*/,
  /[/\\]\.local[/\\]eas-artifacts[/\\].*/,
];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  ...artifactBlockList
];

module.exports = config;
