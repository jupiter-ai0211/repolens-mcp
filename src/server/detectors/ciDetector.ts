import * as fs from "node:fs";
import { safePath } from "../core/safePath.js";
import { fileExists } from "../core/fileExists.js";
import { safeReadFile } from "../core/safeReadFile.js";
import { safeReadYaml } from "../core/safeReadYaml.js";

export interface WorkflowSummary {
  file: string;
  name: string | null;
  triggers: string[];
  jobs: string[];
}

export interface CiReport {
  providers: string[];
  workflowFiles: WorkflowSummary[];
  detectedSteps: {
    install: boolean;
    lint: boolean;
    test: boolean;
    build: boolean;
    docker: boolean;
    deploy: boolean;
  };
  warnings: string[];
}

interface ProviderProbe {
  provider: string;
  /** A file or directory that signals this provider is in use. */
  path: string;
}

const PROVIDER_PROBES: ProviderProbe[] = [
  { provider: "github-actions", path: ".github/workflows" },
  { provider: "gitlab-ci", path: ".gitlab-ci.yml" },
  { provider: "circleci", path: ".circleci/config.yml" },
  { provider: "circleci", path: "circle.yml" },
  { provider: "azure-pipelines", path: "azure-pipelines.yml" },
  { provider: "bitbucket-pipelines", path: "bitbucket-pipelines.yml" },
  { provider: "travis-ci", path: ".travis.yml" },
];

const STEP_KEYWORDS: { step: keyof CiReport["detectedSteps"]; res: RegExp[] }[] =
  [
    {
      step: "install",
      res: [
        /\b(npm (ci|install)|pnpm (install|i)\b|yarn install|yarn --frozen|bun install)/i,
        /pip install|poetry install|composer install/i,
      ],
    },
    {
      step: "lint",
      res: [/\b(eslint|run lint|biome|prettier --check|ruff|flake8)/i],
    },
    {
      step: "test",
      res: [/\b(npm test|run test|vitest|jest|playwright|cypress|pytest|go test)/i],
    },
    {
      step: "build",
      res: [/\b(run build|next build|vite build|tsc\b|nuxt build|go build)/i],
    },
    { step: "docker", res: [/docker (build|push|buildx)|docker\/build-push/i] },
    {
      step: "deploy",
      res: [
        /\b(deploy|vercel|netlify|gh-pages|aws |aws-actions|gcloud|fly deploy|render)/i,
      ],
    },
  ];

/** Lists workflow file names under .github/workflows (safe, never throws). */
function listGithubWorkflows(root: string): string[] {
  if (!fileExists(root, ".github/workflows")) {
    return [];
  }
  let dir: string;
  try {
    dir = safePath(root, ".github/workflows");
  } catch {
    return [];
  }
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (e) =>
        e.isFile() && /\.(ya?ml)$/i.test(e.name),
    )
    .map((e) => `.github/workflows/${e.name}`)
    .sort((a, b) => a.localeCompare(b));
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

function summarizeWorkflow(
  file: string,
  parsed: Record<string, unknown> | null,
): WorkflowSummary {
  if (!parsed) {
    return { file, name: null, triggers: [], jobs: [] };
  }
  const name = typeof parsed.name === "string" ? parsed.name : null;
  // `on` is a YAML keyword that can parse to boolean true in some libraries;
  // the `yaml` package keeps it as the string key "on".
  const triggers = asStringArray(parsed.on ?? (parsed as { true?: unknown }).true);
  const jobs = asStringArray(parsed.jobs);
  return { file, name, triggers, jobs };
}

/** Detects CI/CD providers and approximate workflow behavior. Read-only. */
export function detectCi(root: string): CiReport {
  const providers = new Set<string>();
  const warnings: string[] = [];

  for (const probe of PROVIDER_PROBES) {
    if (fileExists(root, probe.path)) {
      providers.add(probe.provider);
    }
  }

  const detectedSteps = {
    install: false,
    lint: false,
    test: false,
    build: false,
    docker: false,
    deploy: false,
  };

  const applyKeywords = (text: string): void => {
    for (const { step, res } of STEP_KEYWORDS) {
      if (!detectedSteps[step] && res.some((re) => re.test(text))) {
        detectedSteps[step] = true;
      }
    }
  };

  const workflowFiles: WorkflowSummary[] = [];

  for (const file of listGithubWorkflows(root)) {
    const yaml = safeReadYaml<Record<string, unknown>>(root, file);
    if (yaml.parseError) {
      warnings.push(`Could not parse ${file}: ${yaml.parseError}`);
    }
    workflowFiles.push(summarizeWorkflow(file, yaml.data));

    const raw = safeReadFile(root, file);
    if (raw.content) {
      applyKeywords(raw.content);
    }
  }

  // Scan other providers' single-file configs for step keywords too.
  for (const probe of PROVIDER_PROBES) {
    if (probe.provider === "github-actions") {
      continue;
    }
    if (fileExists(root, probe.path)) {
      const raw = safeReadFile(root, probe.path);
      if (raw.content) {
        applyKeywords(raw.content);
      }
    }
  }

  return {
    providers: [...providers].sort((a, b) => a.localeCompare(b)),
    workflowFiles,
    detectedSteps,
    warnings,
  };
}
