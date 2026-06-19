import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getWorkspaceRoot } from "../core/workspace.js";
import { walkFiles } from "../core/fileWalker.js";
import { DEFAULT_MAX_RESULTS } from "../core/limits.js";
import { jsonResult, errorResult } from "../core/output.js";

const DEFAULT_MIN_SIZE_KB = 500;

export interface LargeFile {
  file: string;
  sizeKb: number;
}

export interface FindLargeFilesOptions {
  minSizeKb?: number;
  maxResults?: number;
}

export interface FindLargeFilesResult {
  results: LargeFile[];
  count: number;
  minSizeKb: number;
  truncated: boolean;
}

/** Pure logic for find_large_files. Returns metadata only — never contents. */
export function findLargeFiles(
  root: string,
  options: FindLargeFilesOptions = {},
): FindLargeFilesResult {
  const minSizeKb = options.minSizeKb ?? DEFAULT_MIN_SIZE_KB;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const minSizeBytes = minSizeKb * 1024;

  const matches: LargeFile[] = [];
  for (const file of walkFiles(root)) {
    if (file.sizeBytes >= minSizeBytes) {
      matches.push({
        file: file.relativePath,
        sizeKb: Math.round(file.sizeBytes / 1024),
      });
    }
  }

  matches.sort((a, b) => b.sizeKb - a.sizeKb);
  const truncated = matches.length > maxResults;

  return {
    results: matches.slice(0, maxResults),
    count: Math.min(matches.length, maxResults),
    minSizeKb,
    truncated,
  };
}

export function registerFindLargeFiles(server: McpServer): void {
  server.registerTool(
    "find_large_files",
    {
      title: "Find Large Files",
      description:
        "Finds files at or above a size threshold (default 500 KB) and returns " +
        "their path and size in KB, sorted largest first. Metadata only — never " +
        "returns file contents. Ignores dependency and build folders.",
      inputSchema: {
        minSizeKb: z
          .number()
          .positive()
          .optional()
          .describe("Minimum file size in KB to report (default 500)."),
        maxResults: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of files to return (default 50)."),
      },
    },
    async (args) => {
      try {
        const root = getWorkspaceRoot();
        return jsonResult(
          findLargeFiles(root, {
            minSizeKb: args.minSizeKb,
            maxResults: args.maxResults,
          }),
        );
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
