import * as path from "node:path";
import * as fs from "node:fs";

export class PathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSafetyError";
  }
}

/**
 * Returns true when `child` is the same as, or nested inside, `root`.
 * Both inputs must be absolute, normalized paths.
 */
function isInside(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/**
 * Resolves a user-supplied path against the workspace root and guarantees the
 * result stays inside the workspace.
 *
 * Protections:
 *   - Rejects `../` traversal that escapes the root.
 *   - Rejects absolute paths that point outside the root.
 *   - Follows symlinks (via realpath) and rejects targets that resolve outside
 *     the root, blocking symlink-escape attacks.
 *
 * @param root          Absolute workspace root (from getWorkspaceRoot).
 * @param candidate     Relative or absolute path requested by the caller.
 * @returns             A safe absolute path guaranteed to be within `root`.
 * @throws PathSafetyError when the path escapes the workspace.
 */
export function safePath(root: string, candidate: string): string {
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new PathSafetyError("Path must be a non-empty string.");
  }

  // Reject NUL bytes outright.
  if (candidate.includes("\0")) {
    throw new PathSafetyError("Path contains invalid characters.");
  }

  const absoluteRoot = path.resolve(root);
  const resolved = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(absoluteRoot, candidate);

  if (!isInside(absoluteRoot, resolved)) {
    throw new PathSafetyError(
      `Path escapes the workspace and was blocked: ${candidate}`,
    );
  }

  // If the path (or any parent) exists, resolve symlinks and re-verify so a
  // symlink inside the workspace cannot point outside it.
  const realRoot = safeRealpath(absoluteRoot);
  const realResolved = safeRealpath(resolved);
  if (realResolved !== null && realRoot !== null) {
    if (!isInside(realRoot, realResolved)) {
      throw new PathSafetyError(
        `Path resolves (via symlink) outside the workspace and was blocked: ${candidate}`,
      );
    }
  }

  return resolved;
}

/**
 * Resolves the real path of the nearest existing ancestor of `target`.
 * Returns null when nothing along the chain exists yet.
 */
function safeRealpath(target: string): string | null {
  let current = target;
  // Walk up until we find a path that exists, then realpath it.
  // This handles not-yet-existing files while still catching symlinked dirs.
  for (;;) {
    try {
      const real = fs.realpathSync.native(current);
      // Re-append the non-existent suffix we walked past.
      const suffix = path.relative(current, target);
      return suffix ? path.resolve(real, suffix) : real;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}
