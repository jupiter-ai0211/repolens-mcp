import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./createServer.js";

/**
 * RepoLens MCP server entrypoint.
 *
 * Launched as a subprocess by the VS Code extension. Communicates over stdio
 * using JSON-RPC. IMPORTANT: only the MCP transport may write to stdout — all
 * diagnostics go to stderr.
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is reserved for the MCP protocol.
  process.stderr.write(
    `${SERVER_NAME} MCP server v${SERVER_VERSION} running on stdio\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `Fatal error starting ${SERVER_NAME} MCP server: ${
      err instanceof Error ? err.stack ?? err.message : String(err)
    }\n`,
  );
  process.exit(1);
});
