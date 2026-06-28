import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { detectCi } from "../detectors/ciDetector.js";

export function registerInspectCi(server: McpServer): void {
  server.registerTool(
    "inspect_ci",
    {
      title: "Inspect CI/CD",
      description:
        "Detects CI/CD providers (GitHub Actions, GitLab CI, CircleCI, Azure " +
        "Pipelines, ...) and approximate workflow behavior: triggers, jobs, " +
        "and whether install/lint/test/build/docker/deploy steps appear. " +
        "Read-only; reads config files only and never returns secrets.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(detectCi(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
