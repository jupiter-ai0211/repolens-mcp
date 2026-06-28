import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { detectDependencies } from "../detectors/dependencyDetector.js";

export function registerInspectDependencies(server: McpServer): void {
  server.registerTool(
    "inspect_dependencies",
    {
      title: "Inspect Dependencies",
      description:
        "Summarizes the project's dependencies by purpose (frontend, backend, " +
        "testing, database, auth, build, ...) from package.json, instead of " +
        "dumping the full manifest. Reports the package manager, categorized " +
        "groups, notable dependencies with versions, and counts. Read-only; " +
        "returns names and versions only.",
      inputSchema: {
        includeDevDependencies: z
          .boolean()
          .optional()
          .describe(
            "Whether to include devDependencies in categorization (default true).",
          ),
      },
    },
    async (args) => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(
          detectDependencies(root, {
            includeDevDependencies: args.includeDevDependencies,
          }),
        );
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
