import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { readJsonFile } from "../core/readJson.js";
import {
  detectPackageManager,
  runPrefix,
  type PackageManager,
} from "../core/packageManager.js";
import { jsonResult, errorResult } from "../core/output.js";
import type { PackageJsonLike } from "../detectors/types.js";

export interface PackageScriptsResult {
  packageJsonExists: boolean;
  packageManager: PackageManager;
  scripts: Record<string, string>;
  detectedCommands: Record<string, string>;
}

/** Common script names we surface as ready-to-run commands. */
const COMMON_SCRIPTS = ["dev", "start", "build", "test", "lint", "format"];

/** Pure logic for inspect_package_scripts. */
export function inspectPackageScripts(root: string): PackageScriptsResult {
  const packageManager = detectPackageManager(root);
  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");

  const scripts = pkg.data?.scripts ?? {};
  const prefix = runPrefix(packageManager);

  const detectedCommands: Record<string, string> = {};
  for (const name of COMMON_SCRIPTS) {
    if (scripts[name]) {
      detectedCommands[name] = `${prefix} ${name}`;
    }
  }

  return {
    packageJsonExists: pkg.exists,
    packageManager,
    scripts,
    detectedCommands,
  };
}

export function registerInspectPackageScripts(server: McpServer): void {
  server.registerTool(
    "inspect_package_scripts",
    {
      title: "Inspect Package Scripts",
      description:
        "Reads package.json (only) and reports the detected package manager " +
        "(from lockfiles), the available npm scripts, and ready-to-run " +
        "commands for dev/build/test/lint. Never executes any script.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(inspectPackageScripts(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
