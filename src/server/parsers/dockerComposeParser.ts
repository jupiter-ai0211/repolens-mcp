export interface ComposeService {
  name: string;
  image: string | null;
  build: string | null;
  ports: string[];
  dependsOn: string[];
  volumes: string[];
  /** Environment variable KEYS only — values are never returned. */
  environmentKeys: string[];
}

export interface ComposeInfo {
  services: ComposeService[];
}

function toStringArray(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v)))
      .filter((v) => v.length > 0);
  }
  return [String(value)];
}

/** Extracts the build context as a string regardless of long/short syntax. */
function parseBuild(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    const ctx = (value as Record<string, unknown>).context;
    return typeof ctx === "string" ? ctx : ".";
  }
  return null;
}

/** depends_on can be a list or a map of service -> condition. */
function parseDependsOn(value: unknown): string[] {
  if (Array.isArray(value)) {
    return toStringArray(value);
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

/**
 * environment can be a list of "KEY=value" / "KEY" entries or a map.
 * We return KEYS ONLY — values are deliberately discarded for safety.
 */
function parseEnvironmentKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).split("=")[0].trim())
      .filter((key) => key.length > 0);
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

/**
 * Converts a parsed docker-compose object into a safe, structured summary.
 * Environment values are stripped; only keys survive.
 */
export function parseCompose(parsed: unknown): ComposeInfo {
  const services: ComposeService[] = [];

  const root = parsed as Record<string, unknown> | null;
  const rawServices = root?.services;
  if (rawServices && typeof rawServices === "object") {
    for (const [name, rawDef] of Object.entries(
      rawServices as Record<string, unknown>,
    )) {
      const def = (rawDef ?? {}) as Record<string, unknown>;
      services.push({
        name,
        image: typeof def.image === "string" ? def.image : null,
        build: parseBuild(def.build),
        ports: toStringArray(def.ports),
        dependsOn: parseDependsOn(def.depends_on),
        volumes: toStringArray(def.volumes),
        environmentKeys: parseEnvironmentKeys(def.environment),
      });
    }
  }

  return { services };
}
