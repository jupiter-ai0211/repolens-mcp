import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetProjectOverview } from "./tools/getProjectOverview.js";
import { registerInspectPackageScripts } from "./tools/inspectPackageScripts.js";
import { registerCompareEnvFiles } from "./tools/compareEnvFiles.js";
import { registerFindTodos } from "./tools/findTodos.js";
import { registerDetectProjectStack } from "./tools/detectProjectStack.js";
import { registerFindLargeFiles } from "./tools/findLargeFiles.js";
import { registerInspectDependencies } from "./tools/inspectDependencies.js";
import { registerInspectTests } from "./tools/inspectTests.js";
import { registerInspectCi } from "./tools/inspectCi.js";
import { registerInspectDocker } from "./tools/inspectDocker.js";
import { registerDetectPorts } from "./tools/detectPorts.js";
import { registerInspectReadme } from "./tools/inspectReadme.js";

export const SERVER_NAME = "repolens";
export const SERVER_VERSION = "0.2.0";

/**
 * Creates a fully configured RepoLens MCP server with all tools registered.
 * Transport-agnostic — the caller connects a transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // v0.1 — workspace inspection.
  registerGetProjectOverview(server);
  registerInspectPackageScripts(server);
  registerCompareEnvFiles(server);
  registerFindTodos(server);
  registerDetectProjectStack(server);
  registerFindLargeFiles(server);

  // v0.2 — project intelligence.
  registerInspectDependencies(server);
  registerInspectTests(server);
  registerInspectCi(server);
  registerInspectDocker(server);
  registerDetectPorts(server);
  registerInspectReadme(server);

  return server;
}
