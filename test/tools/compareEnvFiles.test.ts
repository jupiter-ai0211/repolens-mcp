import { describe, it, expect } from "vitest";
import {
  compareEnvFiles,
  parseEnvKeys,
} from "../../src/server/tools/compareEnvFiles.js";
import { fixture } from "../helpers.js";

describe("parseEnvKeys", () => {
  it("extracts keys only and ignores comments and blank lines", () => {
    const keys = parseEnvKeys(
      [
        "# a comment",
        "",
        "FOO=bar",
        "  BAZ = qux ",
        "export SECRET=value",
        "=novalue",
        "INVALID KEY=1",
      ].join("\n"),
    );
    expect([...keys].sort()).toEqual(["BAZ", "FOO", "SECRET"]);
  });

  it("never captures values", () => {
    const keys = parseEnvKeys("API_KEY=super-secret");
    expect([...keys]).toEqual(["API_KEY"]);
    expect(JSON.stringify([...keys])).not.toContain("super-secret");
  });
});

describe("compareEnvFiles", () => {
  it("reports missing, extra, and matched keys without values", () => {
    const result = compareEnvFiles(fixture("env-project"));
    expect(result.envExists).toBe(true);
    expect(result.exampleExists).toBe(true);
    expect(result.missingFromEnv).toEqual(["JWT_SECRET"]);
    expect(result.extraInEnv).toEqual(["LOCAL_ONLY_FLAG"]);
    expect(result.matchedCount).toBe(3);
    expect(result.valuesReturned).toBe(false);
  });

  it("never leaks any secret values in the output", () => {
    const result = compareEnvFiles(fixture("env-project"));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("super-secret-value-should-never-leak");
    expect(serialized).not.toContain("postgres://");
  });

  it("handles a missing .env file cleanly", () => {
    const result = compareEnvFiles(fixture("env-missing"));
    expect(result.envExists).toBe(false);
    expect(result.exampleExists).toBe(true);
    expect(result.missingFromEnv.sort()).toEqual([
      "DATABASE_URL",
      "SECRET_TOKEN",
    ]);
    expect(result.matchedCount).toBe(0);
  });
});
