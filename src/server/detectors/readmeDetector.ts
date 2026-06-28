import { safeReadFile } from "../core/safeReadFile.js";

export interface ReadmeReport {
  hasReadme: boolean;
  readmeFile: string | null;
  sections: string[];
  missingRecommendedSections: string[];
  badges: string[];
  linkCount: number;
  codeBlockCount: number;
  readmeLength: {
    lines: number;
    characters: number;
  };
}

const README_CANDIDATES = [
  "README.md",
  "readme.md",
  "Readme.md",
  "README.markdown",
  "README",
  "README.rst",
];

/** Sections a healthy project README typically includes. */
const RECOMMENDED_SECTIONS = [
  "Installation",
  "Usage",
  "Development",
  "Environment Variables",
  "Testing",
  "Deployment",
  "Troubleshooting",
  "Contributing",
  "License",
];

/** Synonyms so we don't flag a present section just because of wording. */
const SECTION_SYNONYMS: Record<string, string[]> = {
  Installation: ["install", "getting started", "setup", "quick start"],
  Usage: ["usage", "how to use", "examples", "features"],
  Development: ["development", "developing", "contributing", "local development"],
  "Environment Variables": ["environment", "env", "configuration", "config"],
  Testing: ["testing", "tests", "test"],
  Deployment: ["deployment", "deploy", "production"],
  Troubleshooting: ["troubleshooting", "faq", "common issues"],
  Contributing: ["contributing", "contribution", "development"],
  License: ["license", "licence"],
};

function detectBadges(content: string): string[] {
  const badges = new Set<string>();
  // Badge images are markdown image links pointing at shields.io etc.
  const imageLinkRe = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = imageLinkRe.exec(content)) !== null) {
    const url = m[1].toLowerCase();
    if (url.includes("shields.io") || url.includes("badge")) {
      if (url.includes("npm")) badges.add("npm");
      else if (url.includes("build") || url.includes("ci"))
        badges.add("build");
      else if (url.includes("license")) badges.add("license");
      else if (url.includes("coverage") || url.includes("codecov"))
        badges.add("coverage");
      else if (url.includes("version")) badges.add("version");
      else badges.add("badge");
    }
  }
  return [...badges].sort((a, b) => a.localeCompare(b));
}

/** Analyzes README structure and documentation gaps. Read-only. */
export function detectReadme(root: string): ReadmeReport {
  let readmeFile: string | null = null;
  let content: string | null = null;

  for (const candidate of README_CANDIDATES) {
    const raw = safeReadFile(root, candidate);
    if (raw.exists && raw.content !== null) {
      readmeFile = candidate;
      content = raw.content;
      break;
    }
  }

  if (content === null) {
    return {
      hasReadme: false,
      readmeFile: null,
      sections: [],
      missingRecommendedSections: [...RECOMMENDED_SECTIONS],
      badges: [],
      linkCount: 0,
      codeBlockCount: 0,
      readmeLength: { lines: 0, characters: 0 },
    };
  }

  const lines = content.split(/\r?\n/);

  const sections: string[] = [];
  let inFence = false;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const heading = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      sections.push(heading[1].trim());
    }
  }

  const lowerContent = content.toLowerCase();
  const missingRecommendedSections = RECOMMENDED_SECTIONS.filter((section) => {
    const synonyms = SECTION_SYNONYMS[section] ?? [section.toLowerCase()];
    return !synonyms.some((syn) =>
      sections.some((s) => s.toLowerCase().includes(syn)),
    );
  });

  // Count markdown links but exclude image/badge links.
  const linkMatches = lowerContent.match(/(^|[^!])\[[^\]]+\]\([^)]+\)/g) ?? [];
  const codeBlockCount = (content.match(/```/g)?.length ?? 0) >> 1;

  return {
    hasReadme: true,
    readmeFile,
    sections,
    missingRecommendedSections,
    badges: detectBadges(content),
    linkCount: linkMatches.length,
    codeBlockCount,
    readmeLength: {
      lines: lines.length,
      characters: content.length,
    },
  };
}
