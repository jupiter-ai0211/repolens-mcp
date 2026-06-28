import { readJsonFile } from "../core/readJson.js";
import { fileExists } from "../core/fileExists.js";
import { walkFiles } from "../core/fileWalker.js";
import { WALK_HARD_LIMIT } from "../core/limits.js";
import type { PackageJsonLike } from "./types.js";

export interface TestReport {
  frameworks: string[];
  /** Test-related scripts found in package.json. */
  packageScripts: Record<string, string>;
  configFiles: string[];
  testDirectories: string[];
  testFileExamples: string[];
  estimatedTestFileCount: number;
}

/** Max test file examples to surface (per the v0.2 spec). */
const MAX_TEST_EXAMPLES = 20;
/** Cap on files scanned while estimating test counts. */
const MAX_SCANNED_FILES = 3000;

const CONFIG_FILES: { file: string; framework: string }[] = [
  { file: "vitest.config.ts", framework: "Vitest" },
  { file: "vitest.config.js", framework: "Vitest" },
  { file: "vitest.config.mjs", framework: "Vitest" },
  { file: "jest.config.js", framework: "Jest" },
  { file: "jest.config.ts", framework: "Jest" },
  { file: "jest.config.mjs", framework: "Jest" },
  { file: "jest.config.json", framework: "Jest" },
  { file: "playwright.config.ts", framework: "Playwright" },
  { file: "playwright.config.js", framework: "Playwright" },
  { file: "cypress.config.ts", framework: "Cypress" },
  { file: "cypress.config.js", framework: "Cypress" },
  { file: "karma.conf.js", framework: "Karma" },
  { file: "mocharc.js", framework: "Mocha" },
  { file: ".mocharc.json", framework: "Mocha" },
];

const SCRIPT_FRAMEWORK_KEYWORDS: { keyword: string; framework: string }[] = [
  { keyword: "vitest", framework: "Vitest" },
  { keyword: "jest", framework: "Jest" },
  { keyword: "playwright", framework: "Playwright" },
  { keyword: "cypress", framework: "Cypress" },
  { keyword: "mocha", framework: "Mocha" },
  { keyword: "ava", framework: "AVA" },
];

const TEST_DIR_CANDIDATES = ["tests", "test", "__tests__", "e2e", "cypress"];

const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

/** Detects how testing appears to be configured for the project. */
export function detectTests(root: string): TestReport {
  const frameworks = new Set<string>();
  const configFiles: string[] = [];

  for (const { file, framework } of CONFIG_FILES) {
    if (fileExists(root, file)) {
      configFiles.push(file);
      frameworks.add(framework);
    }
  }

  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");
  const allScripts = pkg.data?.scripts ?? {};
  const packageScripts: Record<string, string> = {};
  for (const [name, command] of Object.entries(allScripts)) {
    const cmd = String(command);
    const isTestScript =
      name === "test" ||
      name.startsWith("test:") ||
      name.startsWith("test-") ||
      /(^|[:\-])e2e($|[:\-])/.test(name) ||
      SCRIPT_FRAMEWORK_KEYWORDS.some((k) => cmd.includes(k.keyword));
    if (isTestScript) {
      packageScripts[name] = cmd;
    }
    for (const { keyword, framework } of SCRIPT_FRAMEWORK_KEYWORDS) {
      if (cmd.includes(keyword)) {
        frameworks.add(framework);
      }
    }
  }

  const deps = new Set(
    [
      ...Object.keys(pkg.data?.dependencies ?? {}),
      ...Object.keys(pkg.data?.devDependencies ?? {}),
    ].map((d) => d.toLowerCase()),
  );
  if (deps.has("vitest")) frameworks.add("Vitest");
  if (deps.has("jest")) frameworks.add("Jest");
  if (deps.has("@playwright/test") || deps.has("playwright"))
    frameworks.add("Playwright");
  if (deps.has("cypress")) frameworks.add("Cypress");
  if (deps.has("mocha")) frameworks.add("Mocha");

  const testDirectories = TEST_DIR_CANDIDATES.filter((dir) =>
    fileExists(root, dir),
  );

  const testFileExamples: string[] = [];
  let estimatedTestFileCount = 0;
  for (const file of walkFiles(root, { maxFiles: MAX_SCANNED_FILES })) {
    if (TEST_FILE_RE.test(file.relativePath)) {
      estimatedTestFileCount++;
      if (testFileExamples.length < MAX_TEST_EXAMPLES) {
        testFileExamples.push(file.relativePath);
      }
    }
  }

  const topDirs = new Set(testDirectories);
  for (const example of testFileExamples) {
    if (example.includes("/")) {
      topDirs.add(example.split("/")[0]);
    }
  }

  return {
    frameworks: [...frameworks].sort((a, b) => a.localeCompare(b)),
    packageScripts,
    configFiles: configFiles.sort((a, b) => a.localeCompare(b)),
    testDirectories: [...topDirs].sort((a, b) => a.localeCompare(b)),
    testFileExamples,
    estimatedTestFileCount:
      estimatedTestFileCount >= MAX_SCANNED_FILES
        ? MAX_SCANNED_FILES
        : estimatedTestFileCount,
  };
}

/** Exposed for reuse/aggregation without re-scanning concerns. */
export const TEST_SCAN_HARD_LIMIT = WALK_HARD_LIMIT;
