import { describe, it, expect } from "vitest";
import { getProjectOverview } from "../../src/server/tools/getProjectOverview.js";
import { fixture } from "../helpers.js";

describe("getProjectOverview", () => {
  it("summarizes a Node/TypeScript project", () => {
    const overview = getProjectOverview(fixture("vite-react"));
    expect(overview.workspaceName).toBe("vite-react");
    expect(overview.importantFiles.packageJson).toBe(true);
    expect(overview.importantFiles.tsconfig).toBe(true);
    expect(overview.importantFiles.readme).toBe(true);
    expect(overview.topLevelDirectories).toContain("src");
    expect(overview.topLevelDirectories).not.toContain("vendor");
    expect(overview.summaryHints).toContain("Node.js project");
    expect(overview.summaryHints).toContain("TypeScript project");
  });

  it("detects env example and docker signals correctly", () => {
    const overview = getProjectOverview(fixture("env-project"));
    expect(overview.importantFiles.envExample).toBe(true);
    expect(overview.importantFiles.dockerfile).toBe(false);
  });

  it("flags truncation when maxFiles is exceeded", () => {
    const overview = getProjectOverview(fixture("vite-react"), 1);
    expect(overview.rootFiles.length).toBeLessThanOrEqual(1);
    expect(overview.truncated).toBe(true);
  });

  it("includes detected stack and quick-health intelligence", () => {
    const overview = getProjectOverview(fixture("vite-react"));
    expect(overview.importantFiles.githubActions).toBe(true);
    expect(overview.detectedStack.frameworks).toContain("React");
    expect(overview.detectedStack.testing).toContain("Vitest");
    expect(overview.detectedStack.ci).toContain("GitHub Actions");
    expect(overview.quickHealth.hasReadme).toBe(true);
    expect(overview.quickHealth.hasTests).toBe(true);
    expect(overview.quickHealth.hasCi).toBe(true);
  });
});
