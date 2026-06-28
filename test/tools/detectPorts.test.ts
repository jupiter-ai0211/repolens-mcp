import { describe, it, expect } from "vitest";
import { detectPorts } from "../../src/server/detectors/portDetector.js";
import { fixture } from "../helpers.js";

describe("detectPorts", () => {
  it("detects app and service ports for a dockerized Next.js app", () => {
    const { ports } = detectPorts(fixture("next-fullstack"));
    const map = new Map(ports.map((p) => [p.port, p]));

    expect(map.has(3000)).toBe(true);
    expect(map.has(5432)).toBe(true);
    expect(map.has(6379)).toBe(true);
    expect(map.get(5432)?.confidence).toBe("high");
  });

  it("detects an Express listen() port and compose db port", () => {
    const { ports } = detectPorts(fixture("express-postgres"));
    const map = new Map(ports.map((p) => [p.port, p]));

    expect(map.get(4000)?.confidence).toBe("high");
    expect(map.get(4000)?.source).toMatch(/server\.ts|package\.json/);
    expect(map.has(5432)).toBe(true);
  });

  it("deduplicates ports keeping the highest confidence", () => {
    const { ports } = detectPorts(fixture("next-fullstack"));
    const portNumbers = ports.map((p) => p.port);
    expect(new Set(portNumbers).size).toBe(portNumbers.length);
  });

  it("returns no ports for a bare project", () => {
    const { ports } = detectPorts(fixture("no-config-project"));
    expect(ports).toEqual([]);
  });
});
