import * as fs from "node:fs";
import * as path from "node:path";
import {
  WALK_HARD_LIMIT,
  ignoredDirectories,
} from "./limits.js";

export interface WalkedFile {
  /** Absolute path on disk. */
  absolutePath: string;
  /** Path relative to the workspace root, using POSIX separators. */
  relativePath: string;
  /** File size in bytes. */
  sizeBytes: number;
}

export interface WalkOptions {
  /** Extra directory names to ignore in addition to the defaults. */
  ignoreDirectories?: Iterable<string>;
  /** Maximum number of files to yield. Defaults to {@link WALK_HARD_LIMIT}. */
  maxFiles?: number;
  /** Maximum directory depth to descend (root = 0). Unlimited when omitted. */
  maxDepth?: number;
}

/**
 * Recursively walks files inside the workspace root, yielding metadata only.
 *
 * Safety characteristics:
 *   - Skips ignored directories (defaults + caller-provided).
 *   - Does NOT follow directory symlinks, preventing escape and infinite loops.
 *   - Enforces a hard cap on the number of files visited.
 */
export function* walkFiles(
  root: string,
  options: WalkOptions = {},
): Generator<WalkedFile> {
  const ignored = ignoredDirectories();
  for (const extra of options.ignoreDirectories ?? []) {
    ignored.add(extra);
  }

  const maxFiles = options.maxFiles ?? WALK_HARD_LIMIT;
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;

  let count = 0;

  interface Frame {
    dir: string;
    depth: number;
  }
  const stack: Frame[] = [{ dir: root, depth: 0 }];

  while (stack.length > 0) {
    const { dir, depth } = stack.pop()!;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // Unreadable directory: skip silently.
    }

    for (const entry of entries) {
      if (count >= maxFiles) {
        return;
      }

      const absolutePath = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        // Only consider symlinks that point to regular files, never traverse
        // symlinked directories.
        let stat: fs.Stats;
        try {
          stat = fs.statSync(absolutePath);
        } catch {
          continue;
        }
        if (stat.isFile()) {
          yield toWalkedFile(root, absolutePath, stat.size);
          count++;
        }
        continue;
      }

      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) {
          continue;
        }
        if (depth + 1 <= maxDepth) {
          stack.push({ dir: absolutePath, depth: depth + 1 });
        }
        continue;
      }

      if (entry.isFile()) {
        let size = 0;
        try {
          size = fs.statSync(absolutePath).size;
        } catch {
          continue;
        }
        yield toWalkedFile(root, absolutePath, size);
        count++;
      }
    }
  }
}

function toWalkedFile(
  root: string,
  absolutePath: string,
  sizeBytes: number,
): WalkedFile {
  const relativePath = path
    .relative(root, absolutePath)
    .split(path.sep)
    .join("/");
  return { absolutePath, relativePath, sizeBytes };
}
