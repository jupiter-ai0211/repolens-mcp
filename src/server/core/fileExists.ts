import * as fs from "node:fs";
import { safePath } from "./safePath.js";

/**
 * Safely checks whether a path exists inside the workspace.
 *
 * Returns false (never throws) for paths that escape the workspace or that
 * cannot be stat-ed, so callers can treat detection as best-effort.
 */
export function fileExists(root: string, relativePath: string): boolean {
  let absolute: string;
  try {
    absolute = safePath(root, relativePath);
  } catch {
    return false;
  }
  try {
    return fs.existsSync(absolute);
  } catch {
    return false;
  }
}

/** Returns true only when the path exists and is a regular file. */
export function isFile(root: string, relativePath: string): boolean {
  let absolute: string;
  try {
    absolute = safePath(root, relativePath);
  } catch {
    return false;
  }
  try {
    return fs.statSync(absolute).isFile();
  } catch {
    return false;
  }
}

/** Returns true only when the path exists and is a directory. */
export function isDirectory(root: string, relativePath: string): boolean {
  let absolute: string;
  try {
    absolute = safePath(root, relativePath);
  } catch {
    return false;
  }
  try {
    return fs.statSync(absolute).isDirectory();
  } catch {
    return false;
  }
}
