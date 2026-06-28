import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { detectReadme } from "../detectors/readmeDetector.js";

export function registerInspectReadme(server: McpServer): void {
  server.registerTool(
    "inspect_readme",
    {
      title: "Inspect README",
      description:
        "Analyzes README structure and documentation gaps: section headings, " +
        "recommended sections that are missing, badges, link and code-block " +
        "counts, and length. Read-only; returns headings and metadata only, " +
        "never the full README body.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(detectReadme(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
