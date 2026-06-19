import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { safePath, PathSafetyError } from "../../src/server/core/safePath.js";
import { fixture } from "../helpers.js";

const root = fixture("vite-react");

describe("safePath", () => {
  it("resolves a relative path inside the workspace", () => {
    const resolved = safePath(root, "src/main.ts");
    expect(resolved).toBe(path.join(root, "src", "main.ts"));
  });

  it("allows the root itself", () => {
    expect(safePath(root, ".")).toBe(path.resolve(root));
  });

  it("blocks parent traversal that escapes the root", () => {
    expect(() => safePath(root, "../outside-file")).toThrow(PathSafetyError);
    expect(() => safePath(root, "../../.ssh/id_rsa")).toThrow(PathSafetyError);
  });

  it("blocks absolute paths outside the root", () => {
    const outside =
      process.platform === "win32" ? "C:\\Windows\\System32" : "/etc/passwd";
    expect(() => safePath(root, outside)).toThrow(PathSafetyError);
  });

  it("rejects empty and NUL-containing paths", () => {
    expect(() => safePath(root, "")).toThrow(PathSafetyError);
    expect(() => safePath(root, "src/\0evil")).toThrow(PathSafetyError);
  });

  it("normalizes traversal that stays inside the root", () => {
    const resolved = safePath(root, "src/../src/main.ts");
    expect(resolved).toBe(path.join(root, "src", "main.ts"));
  });
});
