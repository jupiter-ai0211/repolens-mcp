import { describe, it, expect } from "vitest";
import { inspectDocker } from "../../src/server/detectors/dockerInspector.js";
import { fixture } from "../helpers.js";

describe("inspectDocker", () => {
  it("summarizes a multi-stage Dockerfile and Compose services", () => {
    const report = inspectDocker(fixture("next-fullstack"));

    expect(report.hasDockerfile).toBe(true);
    expect(report.hasComposeFile).toBe(true);
    expect(report.composeFiles).toEqual(["docker-compose.yml"]);

    expect(report.dockerfile?.baseImages).toEqual([
      "node:22-alpine",
      "node:22-alpine",
    ]);
    expect(report.dockerfile?.hasMultiStageBuild).toBe(true);
    expect(report.dockerfile?.exposes).toContain("3000");

    const names = report.services.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["app", "postgres", "redis"]));

    const app = report.services.find((s) => s.name === "app");
    expect(app?.build).toBe(".");
    expect(app?.ports).toContain("3000:3000");
    expect(app?.dependsOn).toEqual(
      expect.arrayContaining(["postgres", "redis"]),
    );

    const postgres = report.services.find((s) => s.name === "postgres");
    expect(postgres?.image).toBe("postgres:16");
  });

  it("returns environment KEYS only — never values", () => {
    const report = inspectDocker(fixture("next-fullstack"));
    const app = report.services.find((s) => s.name === "app");
    expect(app?.environmentKeys).toEqual(
      expect.arrayContaining(["DATABASE_URL", "NODE_ENV"]),
    );
    // The secret-bearing value must never appear anywhere in the output.
    expect(JSON.stringify(report)).not.toContain("user:pass");
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("reports no docker for a bare project", () => {
    const report = inspectDocker(fixture("no-config-project"));
    expect(report.hasDockerfile).toBe(false);
    expect(report.hasComposeFile).toBe(false);
    expect(report.services).toEqual([]);
  });
});
