import * as fs from "node:fs";
import { safePath } from "./safePath.js";
import { DEFAULT_MAX_FILE_SIZE_BYTES, envInt } from "./limits.js";

export interface ReadFileResult {
  exists: boolean;
  /** File contents, or null when missing/too large/unreadable. */
  content: string | null;
  /** True when the file exists but exceeded the size limit and was skipped. */
  tooLarge: boolean;
  sizeBytes: number;
}

/** Resolves the effective max readable file size (KB override via env). */
function maxFileSizeBytes(): number {
  return envInt("REPOLENS_MAX_FILE_SIZE_BYTES", DEFAULT_MAX_FILE_SIZE_BYTES);
}

/**
 * Safely reads a UTF-8 text file located inside the workspace.
 *
 * Never throws: returns a structured result so tools can degrade gracefully on
 * missing, oversized, or unreadable files. Files larger than the configured
 * size limit are never read into memory.
 */
export function safeReadFile(
  root: string,
  relativePath: string,
  maxBytes: number = maxFileSizeBytes(),
): ReadFileResult {
  let absolute: string;
  try {
    absolute = safePath(root, relativePath);
  } catch {
    return { exists: false, content: null, tooLarge: false, sizeBytes: 0 };
  }

  let size = 0;
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) {
      return { exists: false, content: null, tooLarge: false, sizeBytes: 0 };
    }
    size = stat.size;
  } catch {
    return { exists: false, content: null, tooLarge: false, sizeBytes: 0 };
  }

  if (size > maxBytes) {
    return { exists: true, content: null, tooLarge: true, sizeBytes: size };
  }

  try {
    const content = fs.readFileSync(absolute, "utf8");
    return { exists: true, content, tooLarge: false, sizeBytes: size };
  } catch {
    return { exists: true, content: null, tooLarge: false, sizeBytes: size };
  }
}
