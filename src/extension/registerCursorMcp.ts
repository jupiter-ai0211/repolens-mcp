import * as vscode from "vscode";
import { buildServerEnv, currentWorkspaceRoot } from "./serverEnv.js";

/** Server name surfaced in Cursor's MCP settings/UI. */
export const CURSOR_SERVER_NAME = "repolens";

/**
 * Minimal local typings for Cursor's extension MCP API
 * (`vscode.cursor.mcp.registerServer`). Cursor does not implement VS Code's
 * finalized `lm.registerMcpServerDefinitionProvider`, so on Cursor we register
 * the bundled stdio server through this Cursor-specific API instead. The types
 * are declared locally because they are not part of `@types/vscode`.
 *
 * See https://cursor.com/docs/extension-api
 */
interface CursorStdioServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface CursorMcpServerConfig {
  name: string;
  server: CursorStdioServer;
}

interface CursorMcpApi {
  registerServer(config: CursorMcpServerConfig): void;
  unregisterServer(name: string): void;
}

function getCursorMcpApi(): CursorMcpApi | undefined {
  const cursor = (vscode as unknown as { cursor?: { mcp?: CursorMcpApi } }).cursor;
  const mcp = cursor?.mcp;
  if (mcp && typeof mcp.registerServer === "function") {
    return mcp;
  }
  return undefined;
}

/** True when running inside an editor that exposes Cursor's MCP extension API. */
export function isCursorMcpAvailable(): boolean {
  return getCursorMcpApi() !== undefined;
}

/**
 * Registers the RepoLens stdio server with Cursor so it appears in Cursor's MCP
 * list and chat automatically — no user-authored `mcp.json` required. Returns a
 * Disposable that unregisters the server, or `undefined` if the Cursor API is
 * not available (e.g. when running in stock VS Code).
 */
export function registerCursorMcp(
  context: vscode.ExtensionContext,
  log: vscode.LogOutputChannel,
): vscode.Disposable | undefined {
  const mcp = getCursorMcpApi();
  if (!mcp) {
    return undefined;
  }

  const serverPath = context.asAbsolutePath("dist/server/index.js");

  const register = () => {
    const root = currentWorkspaceRoot();
    const env = buildServerEnv(root);

    // Re-registering with the same name replaces the prior definition; we
    // unregister first defensively in case Cursor treats it as additive.
    try {
      mcp.unregisterServer(CURSOR_SERVER_NAME);
    } catch {
      // No prior registration — safe to ignore.
    }

    mcp.registerServer({
      name: CURSOR_SERVER_NAME,
      server: {
        command: "node",
        args: [serverPath],
        env,
      },
    });

    log.info(
      `Registered RepoLens MCP server with Cursor (root=${root ?? "<none>"}, ` +
        `script=${serverPath})`,
    );
  };

  register();

  // Re-register when the workspace folder or RepoLens settings change so the
  // server stays scoped to the active project.
  const onFolders = vscode.workspace.onDidChangeWorkspaceFolders(() => register());
  const onConfig = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("repolens")) {
      register();
    }
  });

  const cleanup = new vscode.Disposable(() => {
    try {
      mcp.unregisterServer(CURSOR_SERVER_NAME);
    } catch {
      // Ignore — server may already be gone.
    }
  });

  context.subscriptions.push(onFolders, onConfig, cleanup);
  return cleanup;
}
