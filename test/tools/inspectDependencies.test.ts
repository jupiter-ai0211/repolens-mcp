import { describe, it, expect } from "vitest";
import { detectDependencies } from "../../src/server/detectors/dependencyDetector.js";
import { fixture } from "../helpers.js";

describe("detectDependencies", () => {
  it("categorizes a Next.js full-stack project's dependencies", () => {
    const report = detectDependencies(fixture("next-fullstack"));
    expect(report.ecosystem).toBe("node");
    expect(report.packageJsonExists).toBe(true);
    expect(report.dependencyGroups.frontend).toContain("react");
    expect(report.dependencyGroups.backend).toContain("next");
    expect(report.dependencyGroups.database).toContain("@prisma/client");
    expect(report.dependencyGroups.auth).toContain("next-auth");
    expect(report.dependencyGroups.testing).toEqual(
      expect.arrayContaining(["jest", "@playwright/test"]),
    );
    expect(report.counts.dependencies).toBe(8);
    expect(report.counts.devDependencies).toBe(6);
    const react = report.importantDependencies.find((d) => d.name === "react");
    expect(react?.category).toBe("frontend");
    expect(react?.version).toBe("^18.2.0");
  });

  it("can exclude devDependencies from categorization", () => {
    const withDev = detectDependencies(fixture("next-fullstack"), {
      includeDevDependencies: true,
    });
    const withoutDev = detectDependencies(fixture("next-fullstack"), {
      includeDevDependencies: false,
    });
    expect(withDev.dependencyGroups.testing).toContain("jest");
    expect(withoutDev.dependencyGroups.testing ?? []).not.toContain("jest");
    // Counts always reflect the manifest regardless of the option.
    expect(withoutDev.counts.devDependencies).toBe(6);
  });

  it("handles a missing package.json", () => {
    const report = detectDependencies(fixture("no-config-project"));
    expect(report.packageJsonExists).toBe(false);
    expect(report.importantDependencies).toEqual([]);
  });

  it("does not crash on invalid package.json", () => {
    const report = detectDependencies(fixture("bad-json-project"));
    expect(report.packageJsonExists).toBe(true);
    expect(report.parseError).toBeTruthy();
    expect(report.importantDependencies).toEqual([]);
  });
});
