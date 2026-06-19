import { describe, it, expect } from "vitest";
import { walkFiles } from "../../src/server/core/fileWalker.js";
import { fixture } from "../helpers.js";

const root = fixture("vite-react");

describe("walkFiles", () => {
  it("yields files with POSIX relative paths and sizes", () => {
    const files = [...walkFiles(root)];
    expect(files.length).toBeGreaterThan(0);
    const main = files.find((f) => f.relativePath === "src/main.ts");
    expect(main).toBeDefined();
    expect(main!.relativePath).not.toContain("\\");
    expect(main!.sizeBytes).toBeGreaterThan(0);
  });

  it("skips ignored dependency directories (vendor)", () => {
    const files = [...walkFiles(root)];
    const inVendor = files.filter((f) => f.relativePath.startsWith("vendor/"));
    expect(inVendor).toHaveLength(0);
  });

  it("respects the maxFiles cap", () => {
    const files = [...walkFiles(root, { maxFiles: 2 })];
    expect(files.length).toBeLessThanOrEqual(2);
  });
});
