import { describe, it, expect } from "vitest";
import { detectReadme } from "../../src/server/detectors/readmeDetector.js";
import { fixture } from "../helpers.js";

describe("detectReadme", () => {
  it("analyzes README structure and gaps", () => {
    const report = detectReadme(fixture("express-postgres"));
    expect(report.hasReadme).toBe(true);
    expect(report.readmeFile).toBe("README.md");
    expect(report.sections).toEqual(
      expect.arrayContaining(["Installation", "Usage", "Testing"]),
    );
    expect(report.missingRecommendedSections).toEqual(
      expect.arrayContaining(["Deployment", "License"]),
    );
    expect(report.badges).toContain("build");
    expect(report.linkCount).toBeGreaterThanOrEqual(1);
    expect(report.codeBlockCount).toBeGreaterThanOrEqual(1);
    expect(report.readmeLength.lines).toBeGreaterThan(0);
  });

  it("reports a missing README honestly", () => {
    const report = detectReadme(fixture("no-config-project"));
    expect(report.hasReadme).toBe(false);
    expect(report.readmeFile).toBeNull();
    expect(report.missingRecommendedSections.length).toBeGreaterThan(0);
  });

  it("does not return the full README body", () => {
    const report = detectReadme(fixture("express-postgres"));
    // Headings are returned, but not raw paragraph prose.
    expect(JSON.stringify(report)).not.toContain("used as a RepoLens test");
  });
});
