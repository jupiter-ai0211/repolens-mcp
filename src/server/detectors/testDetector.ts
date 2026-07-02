import * as fs from "node:fs";
import { readJsonFile } from "../core/readJson.js";
import { fileExists } from "../core/fileExists.js";
import { walkFiles } from "../core/fileWalker.js";
import { safeReadFile } from "../core/safeReadFile.js";
import { safePath } from "../core/safePath.js";
import { WALK_HARD_LIMIT } from "../core/limits.js";
import type { PackageJsonLike } from "./types.js";

export interface TestReport {
  frameworks: string[];
  /** Languages inferred from test configs, manifests, and file patterns. */
  languages: string[];
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

const CONFIG_FILES: { file: string; framework: string; languages?: string[] }[] =
  [
    // JavaScript / TypeScript
    { file: "vitest.config.ts", framework: "Vitest", languages: ["TypeScript"] },
    { file: "vitest.config.js", framework: "Vitest", languages: ["JavaScript"] },
    { file: "vitest.config.mjs", framework: "Vitest", languages: ["JavaScript"] },
    { file: "jest.config.js", framework: "Jest", languages: ["JavaScript"] },
    { file: "jest.config.ts", framework: "Jest", languages: ["TypeScript"] },
    { file: "jest.config.mjs", framework: "Jest", languages: ["JavaScript"] },
    { file: "jest.config.json", framework: "Jest" },
    { file: "playwright.config.ts", framework: "Playwright" },
    { file: "playwright.config.js", framework: "Playwright" },
    { file: "cypress.config.ts", framework: "Cypress" },
    { file: "cypress.config.js", framework: "Cypress" },
    { file: "karma.conf.js", framework: "Karma" },
    { file: "mocharc.js", framework: "Mocha" },
    { file: ".mocharc.json", framework: "Mocha" },
    { file: "ava.config.js", framework: "AVA" },
    { file: "jasmine.json", framework: "Jasmine" },
    // Python
    { file: "pytest.ini", framework: "pytest", languages: ["Python"] },
    { file: "tox.ini", framework: "tox", languages: ["Python"] },
    { file: "nose.cfg", framework: "nose", languages: ["Python"] },
    // PHP
    { file: "phpunit.xml", framework: "PHPUnit", languages: ["PHP"] },
    { file: "phpunit.xml.dist", framework: "PHPUnit", languages: ["PHP"] },
    // Ruby
    { file: ".rspec", framework: "RSpec", languages: ["Ruby"] },
    // .NET
    { file: "xunit.runner.json", framework: "xUnit", languages: ["C#"] },
    // Rust
    { file: "nextest.toml", framework: "cargo-nextest", languages: ["Rust"] },
  ];

const SCRIPT_FRAMEWORK_KEYWORDS: { keyword: string; framework: string }[] = [
  { keyword: "vitest", framework: "Vitest" },
  { keyword: "jest", framework: "Jest" },
  { keyword: "playwright", framework: "Playwright" },
  { keyword: "cypress", framework: "Cypress" },
  { keyword: "mocha", framework: "Mocha" },
  { keyword: "ava", framework: "AVA" },
  { keyword: "jasmine", framework: "Jasmine" },
  { keyword: "pytest", framework: "pytest" },
  { keyword: "phpunit", framework: "PHPUnit" },
  { keyword: "rspec", framework: "RSpec" },
  { keyword: "cargo test", framework: "Cargo" },
  { keyword: "go test", framework: "Go testing" },
  { keyword: "dotnet test", framework: "dotnet test" },
  { keyword: "mix test", framework: "ExUnit" },
  { keyword: "flutter test", framework: "Flutter test" },
  { keyword: "dart test", framework: "Dart test" },
  { keyword: "gradle test", framework: "Gradle" },
  { keyword: "mvn test", framework: "Maven Surefire" },
  { keyword: "scalatest", framework: "ScalaTest" },
  { keyword: "karma", framework: "Karma" },
];

const TEST_DIR_CANDIDATES = [
  "tests",
  "test",
  "__tests__",
  "__test__",
  "e2e",
  "cypress",
  "spec",
  "Specs",
  "Tests",
  "Features",
  "integration-tests",
  "integration_test",
  "unit-tests",
  "testdata",
  "test-data",
  "t",
];

const TEST_FILE_PATTERNS: { pattern: RegExp; languages: string[] }[] = [
  {
    pattern: /\.(test|spec)\.[cm]?[jt]sx?$/i,
    languages: ["JavaScript", "TypeScript"],
  },
  {
    pattern: /(^|\/)test_[^/]+\.py$|(^|\/)conftest\.py$|_test\.py$/i,
    languages: ["Python"],
  },
  { pattern: /_test\.go$/i, languages: ["Go"] },
  {
    pattern: /_spec\.rb$|(^|\/)test\/[^/]+\.rb$/i,
    languages: ["Ruby"],
  },
  {
    pattern: /(?:Test|Tests|Spec)\.(java|kt)$/i,
    languages: ["Java", "Kotlin"],
  },
  { pattern: /(?:Tests?|Test)\.cs$/i, languages: ["C#"] },
  { pattern: /Test\.php$/i, languages: ["PHP"] },
  { pattern: /(?:^|\/)tests?\/[^/]+\.rs$/i, languages: ["Rust"] },
  { pattern: /Tests\.swift$/i, languages: ["Swift"] },
  {
    pattern: /(?:Spec|Test|Suite)\.scala$/i,
    languages: ["Scala"],
  },
  { pattern: /_test\.dart$/i, languages: ["Dart"] },
  { pattern: /_test\.exs?$/i, languages: ["Elixir"] },
  { pattern: /_test\.clj(?:c|s)?$/i, languages: ["Clojure"] },
  {
    pattern: /(?:^|\/)test_[^/]+\.(c|cpp|cc|cxx|h|hpp)$/i,
    languages: ["C", "C++"],
  },
  { pattern: /(?:Spec|Test)\.hs$/i, languages: ["Haskell"] },
  { pattern: /(?:^|\/)t\/[^/]+\.t$/i, languages: ["Perl"] },
  { pattern: /_spec\.lua$/i, languages: ["Lua"] },
  { pattern: /(?:^|\/)test(?:-|_)[^/]+\.R$/i, languages: ["R"] },
];

interface ManifestProbe {
  files: string[];
  patterns: { re: RegExp; framework: string; languages?: string[] }[];
}

const MANIFEST_PROBES: ManifestProbe[] = [
  {
    files: ["requirements.txt", "pyproject.toml", "setup.cfg", "setup.py"],
    patterns: [
      { re: /\bpytest\b/i, framework: "pytest", languages: ["Python"] },
      { re: /\bnose\b/i, framework: "nose", languages: ["Python"] },
      { re: /\btox\b/i, framework: "tox", languages: ["Python"] },
      { re: /\bunittest\b/i, framework: "unittest", languages: ["Python"] },
      { re: /\bhypothesis\b/i, framework: "Hypothesis", languages: ["Python"] },
    ],
  },
  {
    files: ["pom.xml"],
    patterns: [
      { re: /\bjunit\b/i, framework: "JUnit", languages: ["Java"] },
      { re: /\btestng\b/i, framework: "TestNG", languages: ["Java"] },
      { re: /\bmockito\b/i, framework: "Mockito", languages: ["Java"] },
      { re: /\bspock\b/i, framework: "Spock", languages: ["Java"] },
    ],
  },
  {
    files: ["build.gradle", "build.gradle.kts"],
    patterns: [
      { re: /\bjunit\b/i, framework: "JUnit", languages: ["Java", "Kotlin"] },
      { re: /\btestng\b/i, framework: "TestNG", languages: ["Java"] },
      { re: /\bkotest\b/i, framework: "Kotest", languages: ["Kotlin"] },
      { re: /\bspek\b/i, framework: "Spek", languages: ["Kotlin"] },
    ],
  },
  {
    files: ["Gemfile", "Gemfile.lock"],
    patterns: [
      { re: /\brspec\b/i, framework: "RSpec", languages: ["Ruby"] },
      { re: /\bminitest\b/i, framework: "Minitest", languages: ["Ruby"] },
      { re: /\bcucumber\b/i, framework: "Cucumber", languages: ["Ruby"] },
    ],
  },
  {
    files: ["go.mod"],
    patterns: [
      { re: /\btestify\b/i, framework: "testify", languages: ["Go"] },
      { re: /\bginkgo\b/i, framework: "Ginkgo", languages: ["Go"] },
      { re: /\bgomega\b/i, framework: "Gomega", languages: ["Go"] },
    ],
  },
  {
    files: ["Cargo.toml"],
    patterns: [
      { re: /.*/, framework: "Cargo", languages: ["Rust"] },
    ],
  },
  {
    files: ["composer.json"],
    patterns: [
      { re: /\bphpunit\b/i, framework: "PHPUnit", languages: ["PHP"] },
      { re: /\bpestphp\b/i, framework: "Pest", languages: ["PHP"] },
    ],
  },
  {
    files: ["build.sbt"],
    patterns: [
      { re: /\bscalatest\b/i, framework: "ScalaTest", languages: ["Scala"] },
      { re: /\bspecs2\b/i, framework: "specs2", languages: ["Scala"] },
      { re: /\bmunit\b/i, framework: "munit", languages: ["Scala"] },
    ],
  },
  {
    files: ["pubspec.yaml"],
    patterns: [
      { re: /\bflutter_test\b/i, framework: "Flutter test", languages: ["Dart"] },
      { re: /\btest:\s*[\^~]/i, framework: "Dart test", languages: ["Dart"] },
    ],
  },
  {
    files: ["mix.exs"],
    patterns: [{ re: /\bExUnit\b/, framework: "ExUnit", languages: ["Elixir"] }],
  },
  {
    files: ["Package.swift"],
    patterns: [
      { re: /\bXCTest\b/, framework: "XCTest", languages: ["Swift"] },
    ],
  },
  {
    files: ["CMakeLists.txt"],
    patterns: [
      {
        re: /\benable_testing\b|\badd_test\s*\(/i,
        framework: "CTest",
        languages: ["C", "C++"],
      },
    ],
  },
  {
    files: ["Makefile", "GNUmakefile"],
    patterns: [
      {
        re: /^test\s*:|\.PHONY:\s*test\b/m,
        framework: "Make test",
      },
    ],
  },
  {
    files: ["Rakefile"],
    patterns: [
      { re: /\btask\s+(:test|test:)/i, framework: "Rake test", languages: ["Ruby"] },
    ],
  },
];

const CSProj_PATTERNS: { re: RegExp; framework: string }[] = [
  { re: /\bxunit\b/i, framework: "xUnit" },
  { re: /\bnunit\b/i, framework: "NUnit" },
  { re: /\bmstest\b/i, framework: "MSTest" },
];

const NPM_TEST_DEPS: Record<string, string> = {
  vitest: "Vitest",
  jest: "Jest",
  "@playwright/test": "Playwright",
  playwright: "Playwright",
  cypress: "Cypress",
  mocha: "Mocha",
  ava: "AVA",
  jasmine: "Jasmine",
  "@testing-library/react": "Testing Library",
  "@testing-library/dom": "Testing Library",
  "@testing-library/jest-dom": "Testing Library",
  tape: "tape",
  tap: "node-tap",
};

function listRootFiles(root: string, suffix: string): string[] {
  let absolute: string;
  try {
    absolute = safePath(root, ".");
  } catch {
    return [];
  }
  try {
    return fs
      .readdirSync(absolute)
      .filter((name) => name.toLowerCase().endsWith(suffix.toLowerCase()));
  } catch {
    return [];
  }
}

function matchTestFile(relativePath: string): string[] {
  const languages = new Set<string>();
  for (const { pattern, languages: langs } of TEST_FILE_PATTERNS) {
    if (pattern.test(relativePath)) {
      langs.forEach((lang) => languages.add(lang));
    }
  }
  return [...languages];
}

function detectFromManifests(
  root: string,
  frameworks: Set<string>,
  languages: Set<string>,
  configFiles: string[],
): void {
  for (const probe of MANIFEST_PROBES) {
    for (const file of probe.files) {
      if (!fileExists(root, file)) {
        continue;
      }
      if (!configFiles.includes(file)) {
        configFiles.push(file);
      }
      const { content } = safeReadFile(root, file);
      if (!content) {
        continue;
      }
      for (const { re, framework, languages: langs } of probe.patterns) {
        if (re.test(content)) {
          frameworks.add(framework);
          langs?.forEach((lang) => languages.add(lang));
        }
      }
    }
  }

  for (const csproj of listRootFiles(root, ".csproj")) {
    configFiles.push(csproj);
    const { content } = safeReadFile(root, csproj);
    if (!content) {
      continue;
    }
    languages.add("C#");
    for (const { re, framework } of CSProj_PATTERNS) {
      if (re.test(content)) {
        frameworks.add(framework);
      }
    }
  }

  if (fileExists(root, "go.mod")) {
    languages.add("Go");
    frameworks.add("Go testing");
  }

  if (fileExists(root, "Cargo.toml")) {
    languages.add("Rust");
  }

  if (fileExists(root, "Gemfile")) {
    languages.add("Ruby");
  }

  if (fileExists(root, "composer.json")) {
    languages.add("PHP");
  }

  if (fileExists(root, "mix.exs")) {
    languages.add("Elixir");
    frameworks.add("ExUnit");
  }

  if (fileExists(root, "Package.swift")) {
    languages.add("Swift");
    frameworks.add("XCTest");
  }

  if (fileExists(root, "build.sbt")) {
    languages.add("Scala");
  }

  if (fileExists(root, "pubspec.yaml")) {
    languages.add("Dart");
  }
}

function detectNodeTesting(
  root: string,
  frameworks: Set<string>,
  languages: Set<string>,
  packageScripts: Record<string, string>,
): void {
  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");
  const allScripts = pkg.data?.scripts ?? {};

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

  for (const [dep, framework] of Object.entries(NPM_TEST_DEPS)) {
    if (deps.has(dep)) {
      frameworks.add(framework);
    }
  }

  if (pkg.exists) {
    languages.add("JavaScript");
    if (
      deps.has("typescript") ||
      fileExists(root, "tsconfig.json") ||
      [...deps].some((d) => d.startsWith("@types/"))
    ) {
      languages.add("TypeScript");
    }
  }
}

/** Detects how testing appears to be configured for the project. */
export function detectTests(root: string): TestReport {
  const frameworks = new Set<string>();
  const languages = new Set<string>();
  const configFiles: string[] = [];

  for (const { file, framework, languages: langs } of CONFIG_FILES) {
    if (fileExists(root, file)) {
      configFiles.push(file);
      frameworks.add(framework);
      langs?.forEach((lang) => languages.add(lang));
    }
  }

  const packageScripts: Record<string, string> = {};
  detectNodeTesting(root, frameworks, languages, packageScripts);
  detectFromManifests(root, frameworks, languages, configFiles);

  const testDirectories = TEST_DIR_CANDIDATES.filter((dir) =>
    fileExists(root, dir),
  );

  const testFileExamples: string[] = [];
  let estimatedTestFileCount = 0;
  for (const file of walkFiles(root, { maxFiles: MAX_SCANNED_FILES })) {
    const fileLangs = matchTestFile(file.relativePath);
    if (fileLangs.length > 0) {
      estimatedTestFileCount++;
      fileLangs.forEach((lang) => languages.add(lang));
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
    languages: [...languages].sort((a, b) => a.localeCompare(b)),
    packageScripts,
    configFiles: [...new Set(configFiles)].sort((a, b) => a.localeCompare(b)),
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
