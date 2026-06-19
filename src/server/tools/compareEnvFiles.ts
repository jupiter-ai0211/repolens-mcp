import * as fs from "node:fs";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { safePath, PathSafetyError } from "../core/safePath.js";
import { jsonResult, errorResult } from "../core/output.js";

export interface EnvComparison {
  envPath: string;
  examplePath: string;
  envExists: boolean;
  exampleExists: boolean;
  missingFromEnv: string[];
  extraInEnv: string[];
  matchedCount: number;
  /** Always false — RepoLens never returns env values. */
  valuesReturned: false;
}

/**
 * Extracts the set of variable KEYS from a .env-style file body.
 * Values are never captured or returned.
 */
export function parseEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    // Support optional "export " prefix.
    const withoutExport = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;

    const eqIndex = withoutExport.indexOf("=");
    if (eqIndex <= 0) {
      continue; // No key, or starts with '=' — ignore.
    }
    const key = withoutExport.slice(0, eqIndex).trim();
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) {
      keys.add(key);
    }
  }
  return keys;
}

function readKeysIfExists(absolutePath: string): {
  exists: boolean;
  keys: Set<string>;
} {
  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    return { exists: true, keys: parseEnvKeys(content) };
  } catch {
    return { exists: false, keys: new Set() };
  }
}

/** Pure logic for compare_env_files. */
export function compareEnvFiles(
  root: string,
  envPath = ".env",
  examplePath = ".env.example",
): EnvComparison {
  const envAbs = safePath(root, envPath);
  const exampleAbs = safePath(root, examplePath);

  const env = readKeysIfExists(envAbs);
  const example = readKeysIfExists(exampleAbs);

  const missingFromEnv = [...example.keys]
    .filter((k) => !env.keys.has(k))
    .sort();
  const extraInEnv = [...env.keys]
    .filter((k) => !example.keys.has(k))
    .sort();
  const matchedCount = [...example.keys].filter((k) => env.keys.has(k)).length;

  return {
    envPath,
    examplePath,
    envExists: env.exists,
    exampleExists: example.exists,
    missingFromEnv,
    extraInEnv,
    matchedCount,
    valuesReturned: false,
  };
}

export function registerCompareEnvFiles(server: McpServer): void {
  server.registerTool(
    "compare_env_files",
    {
      title: "Compare Env Files",
      description:
        "Compares a .env file against a .env.example template and reports which " +
        "keys are missing, extra, or matched. Returns KEYS ONLY — it never " +
        "reads or returns secret values, and blocks paths outside the workspace.",
      inputSchema: {
        envPath: z
          .string()
          .optional()
          .describe("Path to the env file (default '.env')."),
        examplePath: z
          .string()
          .optional()
          .describe("Path to the example file (default '.env.example')."),
      },
    },
    async (args) => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(
          compareEnvFiles(root, args.envPath, args.examplePath),
        );
      } catch (err) {
        if (err instanceof PathSafetyError) {
          return errorResult(err.message);
        }
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
