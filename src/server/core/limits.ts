/**
 * Centralized limits and ignore lists used across all RepoLens tools.
 *
 * These values keep tool output small, fast, and safe. They can be overridden
 * per-tool by passing explicit options, and globally via environment variables
 * injected by the VS Code extension.
 */

export const DEFAULT_MAX_RESULTS = 50;
export const DEFAULT_MAX_FILES = 100;

/** Files larger than this (in bytes) are never read for their contents. */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

/** Hard ceiling on how many entries fileWalker will ever visit. */
export const WALK_HARD_LIMIT = 20000;

/** Directories that are always skipped during traversal. */
export const DEFAULT_IGNORED_DIRECTORIES: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".cache",
  "coverage",
  "vendor",
  "target",
  "bin",
  "obj",
  ".turbo",
  ".svelte-kit",
  "__pycache__",
  ".venv",
  "venv",
]);

/** File extensions treated as binary / non-text and skipped by text tools. */
export const DEFAULT_IGNORED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".mp3",
  ".wav",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".class",
  ".jar",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
]);

/**
 * Reads an integer environment variable, falling back to a default when unset
 * or invalid.
 */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Extra ignored directories supplied via REPOLENS_IGNORE_DIRS (comma-separated). */
export function extraIgnoredDirectories(): Set<string> {
  const raw = process.env.REPOLENS_IGNORE_DIRS;
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

/** The full set of ignored directories (defaults + user-provided extras). */
export function ignoredDirectories(): Set<string> {
  const merged = new Set<string>(DEFAULT_IGNORED_DIRECTORIES);
  for (const dir of extraIgnoredDirectories()) {
    merged.add(dir);
  }
  return merged;
}
