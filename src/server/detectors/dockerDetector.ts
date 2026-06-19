import type { Detector } from "./types.js";

/** Detects Docker and Docker Compose usage from sentinel files. */
export const dockerDetector: Detector = (ctx) => {
  const frameworks: string[] = [];
  const deploymentHints: string[] = [];

  const hasDockerfile = ctx.hasFile("Dockerfile");
  const hasCompose =
    ctx.hasFile("docker-compose.yml") ||
    ctx.hasFile("docker-compose.yaml") ||
    ctx.hasFile("compose.yml") ||
    ctx.hasFile("compose.yaml");

  if (hasDockerfile) {
    frameworks.push("Docker");
  } else {
    deploymentHints.push("Dockerfile not found");
  }

  if (hasCompose) {
    frameworks.push("Docker Compose");
  }

  return { frameworks, deploymentHints };
};
