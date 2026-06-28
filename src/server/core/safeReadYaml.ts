import { parse as parseYaml } from "yaml";
import { safeReadFile } from "./safeReadFile.js";

export interface ReadYamlResult<T> {
  exists: boolean;
  data: T | null;
  tooLarge: boolean;
  /** Set when the file exists but could not be parsed as YAML. */
  parseError?: string;
}

/**
 * Safely reads and parses a YAML file inside the workspace.
 *
 * Never throws on missing, oversized, or invalid files — returns a structured
 * result so tools can report "found but unparsable" honestly.
 */
export function safeReadYaml<T = unknown>(
  root: string,
  relativePath: string,
): ReadYamlResult<T> {
  const file = safeReadFile(root, relativePath);

  if (!file.exists) {
    return { exists: false, data: null, tooLarge: false };
  }
  if (file.tooLarge || file.content === null) {
    return { exists: true, data: null, tooLarge: file.tooLarge };
  }

  try {
    return {
      exists: true,
      data: (parseYaml(file.content) ?? null) as T | null,
      tooLarge: false,
    };
  } catch (err) {
    return {
      exists: true,
      data: null,
      tooLarge: false,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}
