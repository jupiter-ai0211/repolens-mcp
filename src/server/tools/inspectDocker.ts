import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { inspectDocker } from "../detectors/dockerInspector.js";

export function registerInspectDocker(server: McpServer): void {
  server.registerTool(
    "inspect_docker",
    {
      title: "Inspect Docker",
      description:
        "Summarizes container setup: Dockerfile base images, exposed ports, " +
        "and multi-stage builds, plus Docker Compose services with their " +
        "ports, depends_on, volumes, and environment KEYS. Read-only; never " +
        "returns environment values or secrets.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(inspectDocker(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
