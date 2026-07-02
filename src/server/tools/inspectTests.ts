import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { detectTests } from "../detectors/testDetector.js";

export function registerInspectTests(server: McpServer): void {
  server.registerTool(
    "inspect_tests",
    {
      title: "Inspect Tests",
      description:
        "Detects how testing appears to be set up across many stacks (JavaScript, " +
        "TypeScript, Python, Java, Kotlin, C#, Ruby, Go, Rust, PHP, Swift, Scala, " +
        "Dart, Elixir, and more): frameworks, languages, test-related package " +
        "scripts, config/manifest files, test directories, example test files, " +
        "and an estimated test file count. Read-only; never executes tests.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(detectTests(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
