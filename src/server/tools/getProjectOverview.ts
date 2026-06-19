import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { ignoredDirectories, DEFAULT_MAX_FILES } from "../core/limits.js";
import { jsonResult, errorResult } from "../core/output.js";

export interface ProjectOverview {
  workspaceName: string;
  rootFiles: string[];
  importantFiles: {
    packageJson: boolean;
    readme: boolean;
    envExample: boolean;
    dockerfile: boolean;
    dockerCompose: boolean;
    tsconfig: boolean;
  };
  topLevelDirectories: string[];
  summaryHints: string[];
  truncated: boolean;
}

const COMPOSE_NAMES = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
];

/** Pure logic for get_project_overview. Operates on a workspace root. */
export function getProjectOverview(
  root: string,
  maxFiles: number = DEFAULT_MAX_FILES,
): ProjectOverview {
  const ignored = ignoredDirectories();

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const rootFilesAll: string[] = [];
  const topLevelDirectories: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) {
        topLevelDirectories.push(entry.name);
      }
      rootFilesAll.push(entry.name);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      rootFilesAll.push(entry.name);
    }
  }

  rootFilesAll.sort((a, b) => a.localeCompare(b));
  topLevelDirectories.sort((a, b) => a.localeCompare(b));

  const truncated = rootFilesAll.length > maxFiles;
  const rootFiles = rootFilesAll.slice(0, maxFiles);

  const lower = new Set(rootFilesAll.map((name) => name.toLowerCase()));
  const has = (name: string) => lower.has(name.toLowerCase());

  const importantFiles = {
    packageJson: has("package.json"),
    readme: rootFilesAll.some((f) => /^readme(\.|$)/i.test(f)),
    envExample: has(".env.example") || has(".env.sample"),
    dockerfile: has("Dockerfile"),
    dockerCompose: COMPOSE_NAMES.some((n) => has(n)),
    tsconfig: has("tsconfig.json"),
  };

  const summaryHints: string[] = [];
  if (importantFiles.packageJson) {
    summaryHints.push("Node.js project");
  }
  if (importantFiles.tsconfig) {
    summaryHints.push("TypeScript project");
  }
  if (
    has("requirements.txt") ||
    has("pyproject.toml") ||
    has("manage.py") ||
    has("setup.py")
  ) {
    summaryHints.push("Python project");
  }
  if (has("composer.json")) {
    summaryHints.push("PHP project");
  }
  if (has("go.mod")) {
    summaryHints.push("Go project");
  }
  if (has("cargo.toml")) {
    summaryHints.push("Rust project");
  }
  if (importantFiles.dockerfile || importantFiles.dockerCompose) {
    summaryHints.push("Containerized (Docker)");
  }

  return {
    workspaceName: path.basename(root) || root,
    rootFiles,
    importantFiles,
    topLevelDirectories,
    summaryHints,
    truncated,
  };
}

export function registerGetProjectOverview(server: McpServer): void {
  server.registerTool(
    "get_project_overview",
    {
      title: "Get Project Overview",
      description:
        "Returns a quick, structured overview of the workspace: root files, " +
        "important files (package.json, README, .env.example, Dockerfile, " +
        "tsconfig), top-level directories, and high-level summary hints. " +
        "Read-only and never returns file contents.",
      inputSchema: {
        maxFiles: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of root entries to list (default 100)."),
      },
    },
    async (args) => {
      try {
        const root = getWorkspaceRoot();
        const overview = getProjectOverview(
          root,
          args.maxFiles ?? DEFAULT_MAX_FILES,
        );
        return jsonResult(overview);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
