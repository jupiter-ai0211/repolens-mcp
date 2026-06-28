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
    expect(report.estimatedTestFileCount).toBe(0);
  });
});
