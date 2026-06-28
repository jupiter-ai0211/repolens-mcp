export interface DockerfileInfo {
  baseImages: string[];
  exposes: string[];
  hasMultiStageBuild: boolean;
}

/**
 * Extracts high-level signals from a Dockerfile's text. Intentionally
 * line-based and forgiving — we want honest approximate signals, not a full
 * Dockerfile AST.
 */
export function parseDockerfile(content: string): DockerfileInfo {
  const baseImages: string[] = [];
  const exposes: string[] = [];

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const fromMatch = /^FROM\s+(.+)$/i.exec(line);
    if (fromMatch) {
      // Strip "AS <stage>" aliases and platform flags.
      const image = fromMatch[1]
        .replace(/\s+AS\s+\S+$/i, "")
        .replace(/--platform=\S+\s*/i, "")
        .trim();
      if (image) {
        baseImages.push(image);
      }
      continue;
    }

    const exposeMatch = /^EXPOSE\s+(.+)$/i.exec(line);
    if (exposeMatch) {
      for (const token of exposeMatch[1].split(/\s+/)) {
        const port = token.split("/")[0].trim();
        if (port && !exposes.includes(port)) {
          exposes.push(port);
        }
      }
    }
  }

  return {
    baseImages,
    exposes,
    hasMultiStageBuild: baseImages.length > 1,
  };
}
