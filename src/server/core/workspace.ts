import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Resolves the absolute path of the workspace RepoLens is allowed to inspect.
 *
 * Resolution order:
 *   1. REPOLENS_WORKSPACE_ROOT env var (injected by the VS Code extension).
 *   2. The current working directory the server was launched in.
 *
 * The resolved path is verified to exist and to be a directory. Throws when no
 * valid workspace can be determined so tools fail loudly rather than reading
 * an unexpected location.
 */
export function getWorkspaceRoot(): string {
  const fromEnv = process.env.REPOLENS_WORKSPACE_ROOT;
  const candidate =
    fromEnv && fromEnv.trim().length > 0 ? fromEnv : process.cwd();

  const resolved = path.resolve(candidate);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error(`RepoLens workspace root does not exist: ${resolved}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`RepoLens workspace root is not a directory: ${resolved}`);
  }

  return resolved;
}
