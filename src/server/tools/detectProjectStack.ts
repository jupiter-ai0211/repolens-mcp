import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { buildDetectionContext } from "../detectors/context.js";
import type { PackageManager } from "../core/packageManager.js";
import type { Detector, DetectionConfidence } from "../detectors/types.js";
import { nodeDetector } from "../detectors/nodeDetector.js";
import { reactDetector } from "../detectors/reactDetector.js";
import { nextDetector } from "../detectors/nextDetector.js";
import { viteDetector } from "../detectors/viteDetector.js";
import { nestDetector } from "../detectors/nestDetector.js";
import { laravelDetector } from "../detectors/laravelDetector.js";
import { pythonDetector } from "../detectors/pythonDetector.js";
import { dockerDetector } from "../detectors/dockerDetector.js";
import { detectTests } from "../detectors/testDetector.js";
import { detectCi } from "../detectors/ciDetector.js";
import { inspectDocker } from "../detectors/dockerInspector.js";

const DETECTORS: Detector[] = [
  nodeDetector,
  reactDetector,
  nextDetector,
  viteDetector,
  nestDetector,
  laravelDetector,
  pythonDetector,
  dockerDetector,
];

export interface ProjectStack {
  ecosystems: string[];
  languages: string[];
  frameworks: string[];
  runtime: string[];
  packageManager: PackageManager;
  tooling: string[];
  testing: string[];
  ci: string[];
  containerization: string[];
  databases: string[];
  services: string[];
  deploymentHints: string[];
  confidence: {
    framework: DetectionConfidence;
    database: DetectionConfidence;
    deployment: DetectionConfidence;
  };
}

function dedupeSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const CI_PROVIDER_LABELS: Record<string, string> = {
  "github-actions": "GitHub Actions",
  "gitlab-ci": "GitLab CI",
  circleci: "CircleCI",
  "azure-pipelines": "Azure Pipelines",
  "bitbucket-pipelines": "Bitbucket Pipelines",
  "travis-ci": "Travis CI",
};

/** Dependency name -> database / service label. */
const DATABASE_DEPS: Record<string, string> = {
  pg: "PostgreSQL",
  postgres: "PostgreSQL",
  "@prisma/client": "PostgreSQL",
  mysql: "MySQL",
  mysql2: "MySQL",
  sqlite3: "SQLite",
  "better-sqlite3": "SQLite",
  mongodb: "MongoDB",
  mongoose: "MongoDB",
};

const SERVICE_DEPS: Record<string, string> = {
  redis: "Redis",
  ioredis: "Redis",
  amqplib: "RabbitMQ",
  "@elastic/elasticsearch": "Elasticsearch",
};

/** Maps a compose image name to a database/service label. */
function labelFromImage(image: string): { db?: string; service?: string } {
  const lower = image.toLowerCase();
  if (lower.includes("postgres")) return { db: "PostgreSQL" };
  if (lower.includes("mysql") || lower.includes("mariadb"))
    return { db: "MySQL" };
  if (lower.includes("mongo")) return { db: "MongoDB" };
  if (lower.includes("redis")) return { service: "Redis" };
  if (lower.includes("rabbitmq")) return { service: "RabbitMQ" };
  if (lower.includes("elasticsearch")) return { service: "Elasticsearch" };
  return {};
}

/** Pure logic for detect_project_stack. Aggregates all v0.2 detectors. */
export function detectProjectStack(root: string): ProjectStack {
  const ctx = buildDetectionContext(root);

  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const tooling = new Set<string>();
  const deploymentHints = new Set<string>();

  for (const detector of DETECTORS) {
    const result = detector(ctx);
    result.languages?.forEach((v) => languages.add(v));
    result.frameworks?.forEach((v) => frameworks.add(v));
    result.tooling?.forEach((v) => tooling.add(v));
    result.deploymentHints?.forEach((v) => deploymentHints.add(v));
  }

  // Ecosystems / runtime.
  const ecosystems = new Set<string>();
  const runtime = new Set<string>();
  if (ctx.packageJson || ctx.hasFile("package.json")) {
    ecosystems.add("node");
    runtime.add("Node.js");
  }
  if (
    ctx.hasFile("requirements.txt") ||
    ctx.hasFile("pyproject.toml") ||
    ctx.hasFile("manage.py")
  ) {
    ecosystems.add("python");
  }
  if (ctx.hasFile("composer.json")) ecosystems.add("php");
  if (ctx.hasFile("go.mod")) ecosystems.add("go");
  if (ctx.hasFile("Cargo.toml")) ecosystems.add("rust");

  // Testing.
  const testing = new Set(detectTests(root).frameworks);

  // CI.
  const ci = new Set(
    detectCi(root).providers.map((p) => CI_PROVIDER_LABELS[p] ?? p),
  );

  // Containerization.
  const docker = inspectDocker(root);
  const containerization = new Set<string>();
  if (docker.hasDockerfile) containerization.add("Docker");
  if (docker.hasComposeFile) containerization.add("Docker Compose");

  // Databases & services from dependencies + compose images.
  const databases = new Set<string>();
  const services = new Set<string>();
  for (const dep of ctx.allDependencies) {
    if (DATABASE_DEPS[dep]) databases.add(DATABASE_DEPS[dep]);
    if (SERVICE_DEPS[dep]) services.add(SERVICE_DEPS[dep]);
  }
  for (const service of docker.services) {
    if (service.image) {
      const { db, service: svc } = labelFromImage(service.image);
      if (db) databases.add(db);
      if (svc) services.add(svc);
    }
  }

  // Common deployment signals.
  if (
    !ctx.hasFile("vercel.json") &&
    !ctx.hasFile(".vercel") &&
    frameworks.has("Next.js")
  ) {
    deploymentHints.add("Vercel config not found");
  }

  const confidence = {
    framework: (frameworks.size > 0 ? "high" : "low") as DetectionConfidence,
    database: (databases.size > 0 || services.size > 0
      ? "medium"
      : "low") as DetectionConfidence,
    deployment: (docker.hasDockerfile || ci.size > 0
      ? "medium"
      : "low") as DetectionConfidence,
  };

  return {
    ecosystems: dedupeSorted(ecosystems),
    languages: dedupeSorted(languages),
    frameworks: dedupeSorted(frameworks),
    runtime: dedupeSorted(runtime),
    packageManager: ctx.packageManager,
    tooling: dedupeSorted(tooling),
    testing: dedupeSorted(testing),
    ci: dedupeSorted(ci),
    containerization: dedupeSorted(containerization),
    databases: dedupeSorted(databases),
    services: dedupeSorted(services),
    deploymentHints: dedupeSorted(deploymentHints),
    confidence,
  };
}

export function registerDetectProjectStack(server: McpServer): void {
  server.registerTool(
    "detect_project_stack",
    {
      title: "Detect Project Stack",
      description:
        "Detects the project's ecosystems, languages, frameworks, runtime, " +
        "package manager, tooling, testing setup, CI/CD, containerization, " +
        "databases, and services by aggregating RepoLens' detectors. Includes " +
        "rough confidence levels. Read-only.",
      inputSchema: {},
    },
    async () => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(detectProjectStack(root));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
