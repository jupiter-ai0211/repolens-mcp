import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { detectPorts } from "../detectors/portDetector.js";

export function registerDetectPorts(server: McpServer): void {
  server.registerTool(
    "detect_ports",
    {
      title: "Detect Ports",
      description:
        "Infers the ports an app and its services probably use, with a " +
        "confidence level and short reason for each. Combines Docker Compose " +
        "mappings, Dockerfile EXPOSE, .env PORT keys, Vite config, listen() " +
        "calls, package scripts, and framework defaults. Read-only; returns " +
        "ports and reasons only, never full source code.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(detectPorts(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
