/**
 * Helpers for producing the structured tool results MCP expects.
 *
 * Every RepoLens tool returns compact JSON as text content. We also attach
 * `structuredContent` so MCP clients that support it can consume typed output
 * directly.
 */

export interface ToolTextResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  // Index signature keeps this compatible with the MCP SDK's CallToolResult.
  [key: string]: unknown;
}

/** Wraps a JSON-serializable value as a successful tool result. */
export function jsonResult(value: unknown): ToolTextResult {
  const text = JSON.stringify(value, null, 2);
  const result: ToolTextResult = {
    content: [{ type: "text", text }],
  };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    result.structuredContent = value as Record<string, unknown>;
  } else {
    result.structuredContent = { result: value };
  }
  return result;
}

/** Wraps an error message as a (non-throwing) tool error result. */
export function errorResult(message: string): ToolTextResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    structuredContent: { error: message },
    isError: true,
  };
}
