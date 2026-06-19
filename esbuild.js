// Bundles the VS Code extension and the MCP server into self-contained CommonJS
// files under dist/, so the packaged .vsix needs no node_modules at runtime.
const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
};

const builds = [
  // VS Code extension host entrypoint. `vscode` is provided by the host and
  // must stay external.
  {
    ...shared,
    entryPoints: ["src/extension/extension.ts"],
    outfile: "dist/extension/extension.js",
    external: ["vscode"],
  },
  // The MCP server runs as a standalone Node subprocess; bundle all deps.
  {
    ...shared,
    entryPoints: ["src/server/index.ts"],
    outfile: "dist/server/index.js",
  },
];

async function main() {
  if (watch) {
    const contexts = await Promise.all(
      builds.map((options) => esbuild.context(options)),
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.error("esbuild: watching for changes...");
  } else {
    await Promise.all(builds.map((options) => esbuild.build(options)));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
