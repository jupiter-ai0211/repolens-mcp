import { describe, it, expect } from "vitest";
import { findTodos } from "../../src/server/tools/findTodos.js";
import { fixture } from "../helpers.js";

describe("findTodos", () => {
  it("detects TODO-style tags across TS, Python, and Markdown", () => {
    const viteResult = findTodos(fixture("vite-react"));
    const tags = new Set(viteResult.results.map((r) => r.tag));
    expect(tags.has("TODO")).toBe(true);
    expect(tags.has("FIXME")).toBe(true);
    expect(tags.has("HACK")).toBe(true);

    const files = new Set(viteResult.results.map((r) => r.file));
    expect(files.has("src/main.ts")).toBe(true);
    expect(files.has("README.md")).toBe(true);

    const django = findTodos(fixture("python-django"));
    expect(django.results.some((r) => r.file === "manage.py")).toBe(true);
  });

  it("reports correct line numbers and snippets", () => {
    const result = findTodos(fixture("vite-react"));
    const first = result.results.find((r) => r.file === "src/main.ts");
    expect(first?.line).toBe(1);
    expect(first?.text).toContain("TODO");
  });

  it("skips ignored dependency directories", () => {
    const result = findTodos(fixture("vite-react"));
    expect(result.results.some((r) => r.file.startsWith("vendor/"))).toBe(
      false,
    );
  });

  it("respects maxResults and flags truncation", () => {
    const result = findTodos(fixture("vite-react"), { maxResults: 1 });
    expect(result.results).toHaveLength(1);
    expect(result.count).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it("honors include and exclude glob patterns", () => {
    const onlyMd = findTodos(fixture("vite-react"), {
      includePatterns: ["*.md"],
    });
    expect(onlyMd.results.every((r) => r.file.endsWith(".md"))).toBe(true);

    const noMd = findTodos(fixture("vite-react"), {
      excludePatterns: ["*.md"],
    });
    expect(noMd.results.some((r) => r.file.endsWith(".md"))).toBe(false);
  });
});
