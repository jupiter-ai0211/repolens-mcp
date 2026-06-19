import * as vscode from "vscode";

/** The provider id must match the id declared in package.json contributes. */
export const PROVIDER_ID = "repolensProvider";

/**
 * Registers the RepoLens MCP server definition provider.
 *
 * When VS Code asks for server definitions, we return a single local stdio
 * server that launches the bundled `dist/server/index.js` with Node. The
 * current workspace root and user settings are passed via environment
 * variables so the server can scope and limit its inspection.
 */
export function registerMcpProvider(
  context: vscode.ExtensionContext,
  log: vscode.LogOutputChannel,
): vscode.Disposable {
  const didChange = new vscode.EventEmitter<void>();

  const provider: vscode.McpServerDefinitionProvider = {
    onDidChangeMcpServerDefinitions: didChange.event,
    provideMcpServerDefinitions: () => {
      const serverPath = context.asAbsolutePath("dist/server/index.js");
      const folder = vscode.workspace.workspaceFolders?.[0];
      const root = folder?.uri.fsPath;

      const config = vscode.workspace.getConfiguration("repolens");
      const env: Record<string, string> = {};

      if (root) {
        env.REPOLENS_WORKSPACE_ROOT = root;
      }

      const maxResults = config.get<number>("maxResults");
      if (typeof maxResults === "number" && maxResults > 0) {
        env.REPOLENS_MAX_RESULTS = String(maxResults);
      }

      const maxFileSizeKb = config.get<number>("maxFileSizeKb");
      if (typeof maxFileSizeKb === "number" && maxFileSizeKb > 0) {
        env.REPOLENS_MAX_FILE_SIZE_BYTES = String(maxFileSizeKb * 1024);
      }

      const ignoreDirs = config.get<string[]>("ignoreDirectories");
      if (Array.isArray(ignoreDirs) && ignoreDirs.length > 0) {
        env.REPOLENS_IGNORE_DIRS = ignoreDirs.join(",");
      }

      log.info(
        `Providing RepoLens MCP server (root=${root ?? "<none>"}, ` +
          `script=${serverPath})`,
      );

      const definition = new vscode.McpStdioServerDefinition(
        "RepoLens MCP",
        "node",
        [serverPath],
        env,
        "0.1.0",
      );
      if (root) {
        definition.cwd = vscode.Uri.file(root);
      }

      return [definition];
    },
  };

  const registration = vscode.lm.registerMcpServerDefinitionProvider(
    PROVIDER_ID,
    provider,
  );

  // Re-provide definitions when the workspace or configuration changes.
  const onFolders = vscode.workspace.onDidChangeWorkspaceFolders(() =>
    didChange.fire(),
  );
  const onConfig = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("repolens")) {
      didChange.fire();
    }
  });

  context.subscriptions.push(registration, didChange, onFolders, onConfig);
  return registration;
}
