# Changelog

All notable changes to **RepoLens MCP** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-07-01

### Changed

- `inspect_tests` now detects testing setup across **15+ languages and stacks**
  (Python, Java, Kotlin, C#, Ruby, Go, Rust, PHP, Swift, Scala, Dart, Elixir,
  Clojure, C/C++, Haskell, Perl, Lua, R, and more) — not only JavaScript and
  TypeScript. It reads ecosystem manifests (`pyproject.toml`, `pom.xml`,
  `go.mod`, `Gemfile`, `Cargo.toml`, `composer.json`, `*.csproj`, …), config
  files, and language-specific test file patterns.
- `inspect_tests` response now includes a `languages` field listing inferred
  test languages from configs, manifests, and discovered test files.

### Internal

- Added multi-language test fixtures (`python-pytest`, `go-module`,
  `ruby-rspec`) and expanded `inspect_tests` test coverage (57 passing).

## [0.2.0] - 2026-06-28

**Better Project Intelligence.** This release expands RepoLens from basic
workspace inspection into deeper, still **read-only** project intelligence.

### Added

- `inspect_dependencies` — categorizes important dependencies by purpose
  (frontend, backend, testing, database, auth, build, …) with names and
  versions only; never dumps the full manifest.
- `inspect_tests` — detects test frameworks (Vitest, Jest, Playwright,
  Cypress, …), test-related scripts, config files, test directories, example
  test files, and an estimated test file count.
- `inspect_ci` — detects CI/CD providers (GitHub Actions, GitLab CI, CircleCI,
  Azure Pipelines, …) and approximate workflow triggers, jobs, and
  install/lint/test/build/docker/deploy steps.
- `inspect_docker` — summarizes Dockerfile base images, exposed ports, and
  multi-stage builds, plus Compose services with ports, `depends_on`, volumes,
  and environment **keys only**.
- `detect_ports` — infers likely application and service ports from Compose
  mappings, `EXPOSE`, `.env` `PORT` keys, Vite config, `listen()` calls,
  package scripts, and framework defaults, each with a confidence and reason.
- `inspect_readme` — analyzes README structure: section headings, missing
  recommended sections, badges, link/code-block counts, and length.

### Changed

- `detect_project_stack` now aggregates the new detectors and reports
  `ecosystems`, `runtime`, `testing`, `ci`, `containerization`, `databases`,
  `services`, and rough `confidence` levels (existing fields preserved).
- `get_project_overview` now includes a `detectedStack` summary, a
  `quickHealth` snapshot, and a `githubActions` important-file signal.

### Internal

- New shared foundation: `Detection<T>` result types, `safeReadFile`,
  `safeReadYaml`, `fileExists`, dependency-category map, and dedicated
  Dockerfile/Compose parsers.
- Added the `yaml` dependency for robust Compose/workflow parsing (bundled into
  the server via esbuild).
- New fixtures (`next-fullstack`, `express-postgres`, `no-config-project`,
  `bad-json-project`) and detector tests (54 passing).

### Safety

- RepoLens remains read-only: no shell execution, no file writes, and no secret
  values — Docker and `.env` inspection return **keys only**, and path
  traversal/symlink-escape protections still apply.

## [0.1.4] - 2026-06-28

### Added

- **Star this project** section in the README with links to star the GitHub
  repo and rate the extension on the [Open VSX Registry](https://open-vsx.org/extension/jupiter-ai0211/repolens-mcp).

### Changed

- Compressed the demo GIF (`media/repolens_mcp_cursor_10s_demo.gif`) to reduce
  package size and load time.
- Updated the README demo GIF reference to the `v0.1.4` raw URL.

## [0.1.3] - 2026-06-22

### Added

- README demo section embedding the 10-second Cursor usage GIF
  (`media/repolens_mcp_cursor_10s_demo.gif`).
- "Report an issue" badge near the top of the README and a dedicated
  **Reporting issues** section linking to GitHub Issues.

## [0.1.2] - 2026-06-21

### Added

- Cursor-native MCP registration (`registerCursorMcp` using
  `vscode.cursor.mcp.registerServer`) so the server auto-registers on
  activation in Cursor — no user-authored `mcp.json` required.
- Shared `buildServerEnv` / `currentWorkspaceRoot` helper
  (`src/extension/serverEnv.ts`) used by both the VS Code provider and the
  Cursor registration paths.
- Re-registration of the Cursor server on workspace and configuration changes.

### Changed

- `activate()` now registers via whichever API the host exposes (VS Code
  1.101+ provider API and/or the Cursor MCP API) and reports when neither is
  available.

### Fixed

- Server failing to surface in Cursor, which does not implement VS Code's
  finalized `vscode.lm.registerMcpServerDefinitionProvider` API.

## [0.1.1] - 2026-06-18

### Added

- Professional marketplace icon (`media/icon.png`).
- Local MCP API type shim and runtime guard so the extension compiles against
  the older types baseline and degrades gracefully on hosts without the
  finalized MCP API (VS Code 1.101+).

### Changed

- Lowered `engines.vscode` and `@types/vscode` to `^1.96.0` so the extension
  passes marketplace version-compatibility filtering (including VS Code forks
  like Cursor).

## [0.1.0] - 2026-06-18

### Added

- Initial release: a VS Code extension shipping a local stdio MCP server
  (`repolens`) with six read-only inspection tools:
  - `get_project_overview` — workspace structure and important-file signals.
  - `inspect_package_scripts` — package manager and available scripts.
  - `compare_env_files` — compares `.env` and `.env.example` by keys only.
  - `find_todos` — scans for `TODO`/`FIXME`/`HACK`/`XXX`/`BUG`/`SECURITY`.
  - `detect_project_stack` — detects languages, frameworks, and tooling.
  - `find_large_files` — finds large files (metadata only).
- Shared safety layer: `safePath` traversal/symlink guards, `fileWalker` with
  ignore lists and caps, keys-only env comparison, and stderr-only logging.
- Framework detectors (React, Next.js, Vite, NestJS, Laravel, Django, Docker).
- Vitest fixtures and test suite (32 passing).
- esbuild bundling for a self-contained VSIX, plus publisher metadata, repo
  URLs, and Open VSX publishing support.

[0.2.1]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/jupiter-ai0211/repolens-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jupiter-ai0211/repolens-mcp/releases/tag/v0.1.0
