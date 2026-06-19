import type { PackageManager } from "../core/packageManager.js";

/** Minimal shape of the fields we care about in a package.json. */
export interface PackageJsonLike {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Pre-computed signals shared by every detector so we only touch the file
 * system once per detection run.
 */
export interface DetectionContext {
  root: string;
  packageManager: PackageManager;
  packageJson: PackageJsonLike | null;
  /** Merged dependency name set (deps + devDeps + peerDeps), lowercased. */
  allDependencies: Set<string>;
  /** Lookup for top-level file/dir existence, keyed by lowercase name. */
  hasFile: (relativePath: string) => boolean;
}

export interface DetectorResult {
  languages?: string[];
  frameworks?: string[];
  tooling?: string[];
  deploymentHints?: string[];
}

export type Detector = (ctx: DetectionContext) => DetectorResult;
