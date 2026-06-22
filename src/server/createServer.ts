import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetProjectOverview } from "./tools/getProjectOverview.js";
import { registerInspectPackageScripts } from "./tools/inspectPackageScripts.js";
import { registerCompareEnvFiles } from "./tools/compareEnvFiles.js";
import { registerFindTodos } from "./tools/findTodos.js";
import { registerDetectProjectStack } from "./tools/detectProjectStack.js";
import { registerFindLargeFiles } from "./tools/findLargeFiles.js";

export const SERVER_NAME = "repolens";
export const SERVER_VERSION = "0.1.2";

/**
 * Creates a fully configured RepoLens MCP server with all v0.1 tools
 * registered. Transport-agnostic — the caller connects a transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerGetProjectOverview(server);
  registerInspectPackageScripts(server);
  registerCompareEnvFiles(server);
  registerFindTodos(server);
  registerDetectProjectStack(server);
  registerFindLargeFiles(server);

  return server;
}
