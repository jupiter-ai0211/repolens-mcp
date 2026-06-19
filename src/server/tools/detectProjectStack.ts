import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { jsonResult, errorResult } from "../core/output.js";
import { buildDetectionContext } from "../detectors/context.js";
import type { PackageManager } from "../core/packageManager.js";
import type { Detector } from "../detectors/types.js";
import { nodeDetector } from "../detectors/nodeDetector.js";
import { reactDetector } from "../detectors/reactDetector.js";
import { nextDetector } from "../detectors/nextDetector.js";
import { viteDetector } from "../detectors/viteDetector.js";
import { nestDetector } from "../detectors/nestDetector.js";
import { laravelDetector } from "../detectors/laravelDetector.js";
import { pythonDetector } from "../detectors/pythonDetector.js";
import { dockerDetector } from "../detectors/dockerDetector.js";

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
  languages: string[];
  frameworks: string[];
  packageManager: PackageManager;
  tooling: string[];
  deploymentHints: string[];
}

function dedupeSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/** Pure logic for detect_project_stack. */
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

  // Common deployment signals.
  if (
    !ctx.hasFile("vercel.json") &&
    !ctx.hasFile(".vercel") &&
    frameworks.has("Next.js")
  ) {
    deploymentHints.add("Vercel config not found");
  }

  return {
    languages: dedupeSorted(languages),
    frameworks: dedupeSorted(frameworks),
    packageManager: ctx.packageManager,
    tooling: dedupeSorted(tooling),
    deploymentHints: dedupeSorted(deploymentHints),
  };
}

export function registerDetectProjectStack(server: McpServer): void {
  server.registerTool(
    "detect_project_stack",
    {
      title: "Detect Project Stack",
      description:
        "Detects languages, frameworks (React, Next.js, Vite, NestJS, Laravel, " +
        "Django, Docker, ...), the package manager, and tooling by reading " +
        "manifest and config files. Read-only.",
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
