import * as vscode from "vscode";

/**
 * Builds the environment variables passed to the RepoLens stdio server.
 *
 * The server scopes and limits its inspection based on these values; the
 * workspace root is required for the server to know what it may read.
 */
export function buildServerEnv(root: string | undefined): Record<string, string> {
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

  return env;
}

/** Returns the first workspace folder's filesystem path, if any. */
export function currentWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
