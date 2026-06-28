import { describe, it, expect } from "vitest";
import { detectCi } from "../../src/server/detectors/ciDetector.js";
import { fixture } from "../helpers.js";

describe("detectCi", () => {
  it("detects GitHub Actions and approximate steps", () => {
    const report = detectCi(fixture("vite-react"));
    expect(report.providers).toContain("github-actions");
    expect(report.workflowFiles).toHaveLength(1);

    const workflow = report.workflowFiles[0];
    expect(workflow.file).toBe(".github/workflows/ci.yml");
    expect(workflow.name).toBe("CI");
    expect(workflow.triggers).toEqual(
      expect.arrayContaining(["push", "pull_request"]),
    );
    expect(workflow.jobs).toContain("build");

    expect(report.detectedSteps.install).toBe(true);
    expect(report.detectedSteps.lint).toBe(true);
    expect(report.detectedSteps.test).toBe(true);
    expect(report.detectedSteps.build).toBe(true);
    expect(report.detectedSteps.deploy).toBe(false);
    expect(report.warnings).toEqual([]);
  });

  it("reports no providers when CI is absent", () => {
    const report = detectCi(fixture("no-config-project"));
    expect(report.providers).toEqual([]);
    expect(report.workflowFiles).toEqual([]);
  });
});
