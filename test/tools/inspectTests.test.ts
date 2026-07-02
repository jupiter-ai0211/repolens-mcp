import { describe, it, expect } from "vitest";
import { detectTests } from "../../src/server/detectors/testDetector.js";
import { fixture } from "../helpers.js";

describe("detectTests", () => {
  it("detects Vitest and test files in a Vite project", () => {
    const report = detectTests(fixture("vite-react"));
    expect(report.frameworks).toContain("Vitest");
    expect(report.testFileExamples).toContain("src/App.test.tsx");
    expect(report.estimatedTestFileCount).toBeGreaterThanOrEqual(1);
    expect(report.testDirectories).toContain("src");
    expect(report.packageScripts.test).toBe("vitest");
  });

  it("detects Jest and Playwright from a Next.js project's scripts/deps", () => {
    const report = detectTests(fixture("next-fullstack"));
    expect(report.frameworks).toEqual(
      expect.arrayContaining(["Jest", "Playwright"]),
    );
    expect(report.packageScripts).toHaveProperty("test:e2e");
  });

  it("returns empty results for a project with no tests", () => {
    const report = detectTests(fixture("no-config-project"));
    expect(report.frameworks).toEqual([]);
    expect(report.languages).toEqual([]);
    expect(report.estimatedTestFileCount).toBe(0);
  });

  it("detects pytest and Python test files", () => {
    const report = detectTests(fixture("python-pytest"));
    expect(report.frameworks).toContain("pytest");
    expect(report.languages).toContain("Python");
    expect(report.configFiles).toEqual(
      expect.arrayContaining(["pytest.ini", "pyproject.toml"]),
    );
    expect(report.testFileExamples).toContain("tests/test_example.py");
    expect(report.testDirectories).toContain("tests");
  });

  it("detects Go testing from go.mod and _test.go files", () => {
    const report = detectTests(fixture("go-module"));
    expect(report.frameworks).toEqual(
      expect.arrayContaining(["Go testing", "testify"]),
    );
    expect(report.languages).toContain("Go");
    expect(report.configFiles).toContain("go.mod");
    expect(report.testFileExamples).toContain("demo_test.go");
  });

  it("detects RSpec from Ruby fixtures", () => {
    const report = detectTests(fixture("ruby-rspec"));
    expect(report.frameworks).toContain("RSpec");
    expect(report.languages).toContain("Ruby");
    expect(report.configFiles).toEqual(
      expect.arrayContaining([".rspec", "Gemfile"]),
    );
    expect(report.testFileExamples).toContain("spec/example_spec.rb");
    expect(report.testDirectories).toContain("spec");
  });
});
