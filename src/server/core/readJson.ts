import * as fs from "node:fs";
import { safePath } from "./safePath.js";

export interface ReadJsonResult<T> {
  exists: boolean;
  data: T | null;
  /** Set when the file exists but could not be parsed. */
  parseError?: string;
}

/**
 * Safely reads and parses a JSON file located inside the workspace.
 *
 * Never throws on missing files or invalid JSON; instead returns a structured
 * result so tools can degrade gracefully.
 *
 * @param root          Absolute workspace root.
 * @param relativePath  Path to the JSON file, relative to (or inside) root.
 */
export function readJsonFile<T = unknown>(
  root: string,
  relativePath: string,
): ReadJsonResult<T> {
  let absolute: string;
  try {
    absolute = safePath(root, relativePath);
  } catch {
    return { exists: false, data: null };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(absolute, "utf8");
  } catch {
    return { exists: false, data: null };
  }

  try {
    return { exists: true, data: JSON.parse(raw) as T };
  } catch (err) {
    return {
      exists: true,
      data: null,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}
