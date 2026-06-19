import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { walkFiles } from "../core/fileWalker.js";
import {
  DEFAULT_MAX_RESULTS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  DEFAULT_IGNORED_EXTENSIONS,
  envInt,
} from "../core/limits.js";
import { jsonResult, errorResult } from "../core/output.js";

export const TODO_TAGS = [
  "TODO",
  "FIXME",
  "HACK",
  "XXX",
  "BUG",
  "SECURITY",
] as const;

const TAG_REGEX = new RegExp(`\\b(${TODO_TAGS.join("|")})\\b`);

export interface TodoHit {
  file: string;
  line: number;
  tag: string;
  text: string;
}

export interface FindTodosOptions {
  maxResults?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface FindTodosResult {
  results: TodoHit[];
  count: number;
  truncated: boolean;
}

/** Converts a simple glob (supporting * and **) into a RegExp. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000") // placeholder for **
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(relativePath: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(relativePath));
}

/** Pure logic for find_todos. */
export function findTodos(
  root: string,
  options: FindTodosOptions = {},
): FindTodosResult {
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const maxFileSize = envInt(
    "REPOLENS_MAX_FILE_SIZE_BYTES",
    DEFAULT_MAX_FILE_SIZE_BYTES,
  );

  const includeRes = (options.includePatterns ?? []).map(globToRegExp);
  const excludeRes = (options.excludePatterns ?? []).map(globToRegExp);

  const results: TodoHit[] = [];
  let truncated = false;

  for (const file of walkFiles(root)) {
    if (results.length >= maxResults) {
      truncated = true;
      break;
    }

    const ext = path.extname(file.relativePath).toLowerCase();
    if (DEFAULT_IGNORED_EXTENSIONS.has(ext)) {
      continue;
    }
    if (file.sizeBytes > maxFileSize) {
      continue;
    }
    if (includeRes.length > 0 && !matchesAny(file.relativePath, includeRes)) {
      continue;
    }
    if (excludeRes.length > 0 && matchesAny(file.relativePath, excludeRes)) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(file.absolutePath, "utf8");
    } catch {
      continue;
    }

    // Cheap binary guard: skip files containing NUL bytes.
    if (content.includes("\0")) {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const match = TAG_REGEX.exec(lines[i]);
      if (match) {
        results.push({
          file: file.relativePath,
          line: i + 1,
          tag: match[1],
          text: lines[i].trim().slice(0, 200),
        });
        if (results.length >= maxResults) {
          truncated = true;
          break;
        }
      }
    }
  }

  return { results, count: results.length, truncated };
}

export function registerFindTodos(server: McpServer): void {
  server.registerTool(
    "find_todos",
    {
      title: "Find TODOs",
      description:
        "Scans text files in the workspace for TODO/FIXME/HACK/XXX/BUG/SECURITY " +
        "comments and returns file, line, tag, and the matching line snippet. " +
        "Skips binary files, large files, and ignored directories; results are " +
        "capped.",
      inputSchema: {
        maxResults: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of matches to return (default 50)."),
        includePatterns: z
          .array(z.string())
          .optional()
          .describe("Only scan files whose path matches these globs."),
        excludePatterns: z
          .array(z.string())
          .optional()
          .describe("Skip files whose path matches these globs."),
      },
    },
    async (args) => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(
          findTodos(root, {
            maxResults: args.maxResults,
            includePatterns: args.includePatterns,
            excludePatterns: args.excludePatterns,
          }),
        );
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
