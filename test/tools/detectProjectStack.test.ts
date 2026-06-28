import { describe, it, expect } from "vitest";
import { detectProjectStack } from "../../src/server/tools/detectProjectStack.js";
import { fixture } from "../helpers.js";

describe("detectProjectStack", () => {
  it("detects a Vite + React + TypeScript project using pnpm", () => {
    const stack = detectProjectStack(fixture("vite-react"));
    expect(stack.frameworks).toContain("React");
    expect(stack.frameworks).toContain("Vite");
    expect(stack.languages).toContain("TypeScript");
    expect(stack.languages).toContain("JavaScript");
    expect(stack.packageManager).toBe("pnpm");
    expect(stack.tooling).toEqual(
      expect.arrayContaining(["ESLint", "Prettier", "Vitest"]),
    );
  });

  it("detects Next.js with yarn", () => {
    const stack = detectProjectStack(fixture("next-project"));
    expect(stack.frameworks).toContain("Next.js");
    expect(stack.frameworks).toContain("React");
    expect(stack.packageManager).toBe("yarn");
    expect(stack.deploymentHints).toContain("Vercel config not found");
  });

  it("detects a Django/Python project", () => {
    const stack = detectProjectStack(fixture("python-django"));
    expect(stack.languages).toContain("Python");
    expect(stack.frameworks).toContain("Django");
  });

  it("detects NestJS with npm", () => {
    const stack = detectProjectStack(fixture("nestjs"));
    expect(stack.frameworks).toContain("NestJS");
    expect(stack.packageManager).toBe("npm");
    expect(stack.tooling).toContain("Jest");
  });

  it("aggregates v0.2 intelligence for a full-stack project", () => {
    const stack = detectProjectStack(fixture("next-fullstack"));
    expect(stack.ecosystems).toContain("node");
    expect(stack.runtime).toContain("Node.js");
    expect(stack.frameworks).toContain("Next.js");
    expect(stack.testing).toEqual(
      expect.arrayContaining(["Jest", "Playwright"]),
    );
    expect(stack.containerization).toEqual(
      expect.arrayContaining(["Docker", "Docker Compose"]),
    );
    expect(stack.databases).toContain("PostgreSQL");
    expect(stack.services).toContain("Redis");
    expect(stack.confidence.framework).toBe("high");
  });

  it("aggregates CI signals from GitHub Actions", () => {
    const stack = detectProjectStack(fixture("vite-react"));
    expect(stack.ci).toContain("GitHub Actions");
  });
});
