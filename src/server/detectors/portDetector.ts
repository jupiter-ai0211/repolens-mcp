import { readJsonFile } from "../core/readJson.js";
import { safeReadFile } from "../core/safeReadFile.js";
import { inspectDocker } from "./dockerInspector.js";
import type { DetectionConfidence } from "./types.js";
import type { PackageJsonLike } from "./types.js";

export interface PortDetection {
  port: number;
  source: string;
  confidence: DetectionConfidence;
  reason: string;
}

export interface PortReport {
  ports: PortDetection[];
}

const CONFIDENCE_RANK: Record<DetectionConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Candidate source files scanned for explicit `listen(...)` / port config. */
const SOURCE_CANDIDATES = [
  "server.ts",
  "server.js",
  "src/server.ts",
  "src/server.js",
  "src/index.ts",
  "src/index.js",
  "index.ts",
  "index.js",
  "app.ts",
  "app.js",
  "src/app.ts",
  "src/main.ts",
];

const VITE_CONFIGS = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];

/** Low-confidence framework defaults keyed by dependency name. */
const FRAMEWORK_DEFAULTS: { dep: string; port: number; label: string }[] = [
  { dep: "vite", port: 5173, label: "Vite" },
  { dep: "next", port: 3000, label: "Next.js" },
  { dep: "react-scripts", port: 3000, label: "Create React App" },
  { dep: "@angular/core", port: 4200, label: "Angular" },
  { dep: "@sveltejs/kit", port: 5173, label: "SvelteKit" },
  { dep: "nuxt", port: 3000, label: "Nuxt" },
];

/** Low-confidence service defaults keyed by dependency name. */
const SERVICE_DEFAULTS: { dep: string; port: number; label: string }[] = [
  { dep: "pg", port: 5432, label: "PostgreSQL" },
  { dep: "postgres", port: 5432, label: "PostgreSQL" },
  { dep: "redis", port: 6379, label: "Redis" },
  { dep: "ioredis", port: 6379, label: "Redis" },
  { dep: "mysql", port: 3306, label: "MySQL" },
  { dep: "mysql2", port: 3306, label: "MySQL" },
  { dep: "mongodb", port: 27017, label: "MongoDB" },
  { dep: "mongoose", port: 27017, label: "MongoDB" },
];

function isValidPort(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n < 65536;
}

/** Detects likely application and service ports from many honest signals. */
export function detectPorts(root: string): PortReport {
  // Highest-confidence wins per port; first reason recorded is kept.
  const byPort = new Map<number, PortDetection>();

  const add = (
    port: number,
    source: string,
    confidence: DetectionConfidence,
    reason: string,
  ): void => {
    if (!isValidPort(port)) {
      return;
    }
    const existing = byPort.get(port);
    if (
      !existing ||
      CONFIDENCE_RANK[confidence] > CONFIDENCE_RANK[existing.confidence]
    ) {
      byPort.set(port, { port, source, confidence, reason });
    }
  };

  // 1. Docker: compose port mappings (host:container) + Dockerfile EXPOSE.
  const docker = inspectDocker(root);
  for (const service of docker.services) {
    for (const mapping of service.ports) {
      const host = parsePortMapping(mapping);
      if (host !== null) {
        add(
          host,
          docker.composeFiles[0] ?? "docker-compose.yml",
          "high",
          `service "${service.name}" maps ${mapping}`,
        );
      }
    }
  }
  if (docker.dockerfile) {
    for (const expose of docker.dockerfile.exposes) {
      const port = Number.parseInt(expose, 10);
      add(port, "Dockerfile", "high", `Dockerfile EXPOSE ${expose}`);
    }
  }

  // 2. .env.example / .env PORT=xxxx keys.
  for (const envFile of [".env.example", ".env.sample", ".env"]) {
    const raw = safeReadFile(root, envFile);
    if (!raw.content) {
      continue;
    }
    for (const line of raw.content.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]*PORT)\s*=\s*(\d{2,5})/i.exec(line);
      if (m) {
        add(
          Number.parseInt(m[2], 10),
          envFile,
          "high",
          `${m[1]} set in ${envFile}`,
        );
      }
    }
  }

  // 3. vite.config server.port.
  for (const cfg of VITE_CONFIGS) {
    const raw = safeReadFile(root, cfg);
    if (raw.content) {
      const m = /port\s*:\s*(\d{2,5})/.exec(raw.content);
      if (m) {
        add(Number.parseInt(m[1], 10), cfg, "high", `server.port in ${cfg}`);
      }
    }
  }

  // 4. Source: app.listen(xxxx) / .listen(xxxx).
  for (const file of SOURCE_CANDIDATES) {
    const raw = safeReadFile(root, file);
    if (!raw.content) {
      continue;
    }
    const m = /\.listen\(\s*(\d{2,5})/.exec(raw.content);
    if (m) {
      add(
        Number.parseInt(m[1], 10),
        file,
        "high",
        `listen(${m[1]}) call in ${file}`,
      );
    }
  }

  // 5. package.json dev/start scripts with --port / -p flags.
  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");
  const scripts = pkg.data?.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    const m = /(?:--port[=\s]+|-p\s+)(\d{2,5})/.exec(String(command));
    if (m) {
      add(
        Number.parseInt(m[1], 10),
        "package.json",
        "medium",
        `script "${name}" passes port ${m[1]}`,
      );
    }
  }

  // 6. Framework + service defaults (low confidence) from dependencies.
  const deps = new Set(
    [
      ...Object.keys(pkg.data?.dependencies ?? {}),
      ...Object.keys(pkg.data?.devDependencies ?? {}),
    ].map((d) => d.toLowerCase()),
  );
  for (const { dep, port, label } of FRAMEWORK_DEFAULTS) {
    if (deps.has(dep)) {
      add(
        port,
        `${label} default`,
        "low",
        `${label} detected but explicit port not found`,
      );
    }
  }
  for (const { dep, port, label } of SERVICE_DEFAULTS) {
    if (deps.has(dep)) {
      add(
        port,
        `${label} default`,
        "low",
        `${label} dependency detected (default port)`,
      );
    }
  }

  const ports = [...byPort.values()].sort((a, b) => a.port - b.port);
  return { ports };
}

/** Extracts the host port from a compose "host:container" mapping string. */
function parsePortMapping(mapping: string): number | null {
  // Examples: "3000:3000", "127.0.0.1:8080:80", "5432", "3000:3000/tcp".
  const clean = mapping.split("/")[0].trim();
  const parts = clean.split(":");
  // Host port is the second-to-last segment when a container port exists,
  // otherwise the single value.
  const candidate = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  const port = Number.parseInt(candidate, 10);
  return Number.isInteger(port) ? port : null;
}
