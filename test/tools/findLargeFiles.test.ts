import { describe, it, expect } from "vitest";
import { findLargeFiles } from "../../src/server/tools/findLargeFiles.js";
import { fixture } from "../helpers.js";

const root = fixture("large-files");

describe("findLargeFiles", () => {
  it("returns files at or above the size threshold, largest first", () => {
    const result = findLargeFiles(root, { minSizeKb: 2 });
    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0].file).toBe("big.txt");
    expect(result.results[0].sizeKb).toBeGreaterThanOrEqual(2);
    expect(result.results.some((f) => f.file === "small.txt")).toBe(false);
  });

  it("returns metadata only (no contents)", () => {
    const result = findLargeFiles(root, { minSizeKb: 1 });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("xxxx");
  });

  it("respects maxResults and flags truncation", () => {
    const result = findLargeFiles(root, { minSizeKb: 0, maxResults: 1 });
    expect(result.results).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });
});
