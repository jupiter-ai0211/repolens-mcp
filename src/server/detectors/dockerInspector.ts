import { fileExists } from "../core/fileExists.js";
import { safeReadFile } from "../core/safeReadFile.js";
import { safeReadYaml } from "../core/safeReadYaml.js";
import {
  parseDockerfile,
  type DockerfileInfo,
} from "../parsers/dockerfileParser.js";
import {
  parseCompose,
  type ComposeService,
} from "../parsers/dockerComposeParser.js";

export interface DockerReport {
  hasDockerfile: boolean;
  hasComposeFile: boolean;
  composeFiles: string[];
  services: ComposeService[];
  dockerfile: DockerfileInfo | null;
  warnings: string[];
}

const COMPOSE_NAMES = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
];

/**
 * Summarizes container setup: Dockerfile base images / exposed ports / multi-
 * stage builds, plus Compose services (ports, depends_on, volumes, env KEYS).
 * Read-only; environment values are never returned.
 */
export function inspectDocker(root: string): DockerReport {
  const warnings: string[] = [];

  const hasDockerfile = fileExists(root, "Dockerfile");
  let dockerfile: DockerfileInfo | null = null;
  if (hasDockerfile) {
    const raw = safeReadFile(root, "Dockerfile");
    if (raw.content) {
      dockerfile = parseDockerfile(raw.content);
    } else if (raw.tooLarge) {
      warnings.push("Dockerfile exceeded the size limit and was not parsed.");
    }
  }

  const composeFiles = COMPOSE_NAMES.filter((name) => fileExists(root, name));
  const services: ComposeService[] = [];
  const seenServiceNames = new Set<string>();

  for (const file of composeFiles) {
    const yaml = safeReadYaml(root, file);
    if (yaml.parseError) {
      warnings.push(`Could not parse ${file}: ${yaml.parseError}`);
      continue;
    }
    for (const service of parseCompose(yaml.data).services) {
      if (!seenServiceNames.has(service.name)) {
        seenServiceNames.add(service.name);
        services.push(service);
      }
    }
  }

  return {
    hasDockerfile,
    hasComposeFile: composeFiles.length > 0,
    composeFiles,
    services,
    dockerfile,
    warnings,
  };
}
