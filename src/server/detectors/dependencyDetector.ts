import { readJsonFile } from "../core/readJson.js";
import { detectPackageManager } from "../core/packageManager.js";
import { categorizeDependency } from "./dependencyCategories.js";
import type { PackageJsonLike } from "./types.js";

export interface ImportantDependency {
  name: string;
  version: string;
  category: string;
}

export interface DependencyReport {
  ecosystem: string;
  packageManager: string;
  /** Category -> sorted list of matched dependency names. */
  dependencyGroups: Record<string, string[]>;
  /** Notable, categorized dependencies with their declared versions. */
  importantDependencies: ImportantDependency[];
  counts: {
    dependencies: number;
    devDependencies: number;
  };
  packageJsonExists: boolean;
  /** Set when package.json exists but could not be parsed. */
  parseError?: string;
}

const EMPTY_REPORT: DependencyReport = {
  ecosystem: "unknown",
  packageManager: "unknown",
  dependencyGroups: {},
  importantDependencies: [],
  counts: { dependencies: 0, devDependencies: 0 },
  packageJsonExists: false,
};

export interface DependencyDetectorOptions {
  includeDevDependencies?: boolean;
}

/**
 * Summarizes a Node project's dependencies by category without dumping the
 * full package.json. v0.2 supports the Node ecosystem; other ecosystems can be
 * layered in later.
 */
export function detectDependencies(
  root: string,
  options: DependencyDetectorOptions = {},
): DependencyReport {
  const includeDev = options.includeDevDependencies ?? true;
  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");

  if (!pkg.exists) {
    return { ...EMPTY_REPORT };
  }
  if (pkg.parseError || !pkg.data) {
    return {
      ...EMPTY_REPORT,
      ecosystem: "node",
      packageManager: detectPackageManager(root),
      packageJsonExists: true,
      parseError: pkg.parseError ?? "Invalid package.json",
    };
  }

  const deps = pkg.data.dependencies ?? {};
  const devDeps = includeDev ? (pkg.data.devDependencies ?? {}) : {};

  const dependencyGroups: Record<string, string[]> = {};
  const importantDependencies: ImportantDependency[] = [];
  const seen = new Set<string>();

  const consider = (name: string, version: string): void => {
    if (seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    const category = categorizeDependency(name);
    if (!category) {
      return;
    }
    (dependencyGroups[category] ??= []).push(name);
    importantDependencies.push({ name, version, category });
  };

  for (const [name, version] of Object.entries(deps)) {
    consider(name, String(version));
  }
  for (const [name, version] of Object.entries(devDeps)) {
    consider(name, String(version));
  }

  for (const list of Object.values(dependencyGroups)) {
    list.sort((a, b) => a.localeCompare(b));
  }
  importantDependencies.sort((a, b) => a.name.localeCompare(b.name));

  return {
    ecosystem: "node",
    packageManager: detectPackageManager(root),
    dependencyGroups,
    importantDependencies,
    counts: {
      dependencies: Object.keys(deps).length,
      devDependencies: Object.keys(pkg.data.devDependencies ?? {}).length,
    },
    packageJsonExists: true,
  };
}
