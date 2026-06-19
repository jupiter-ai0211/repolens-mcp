import { describe, it, expect } from "vitest";
import { inspectPackageScripts } from "../../src/server/tools/inspectPackageScripts.js";
import { fixture } from "../helpers.js";

describe("inspectPackageScripts", () => {
  it("reads scripts and builds pnpm run commands", () => {
    const result = inspectPackageScripts(fixture("vite-react"));
    expect(result.packageJsonExists).toBe(true);
    expect(result.packageManager).toBe("pnpm");
    expect(result.scripts.dev).toBe("vite");
    expect(result.detectedCommands.dev).toBe("pnpm dev");
    expect(result.detectedCommands.build).toBe("pnpm build");
    expect(result.detectedCommands.test).toBe("pnpm test");
  });

  it("uses 'npm run' for npm projects", () => {
    const result = inspectPackageScripts(fixture("nestjs"));
    expect(result.packageManager).toBe("npm");
    expect(result.detectedCommands.build).toBe("npm run build");
  });

  it("handles a project without package.json", () => {
    const result = inspectPackageScripts(fixture("python-django"));
    expect(result.packageJsonExists).toBe(false);
    expect(result.scripts).toEqual({});
    expect(result.detectedCommands).toEqual({});
  });
});
