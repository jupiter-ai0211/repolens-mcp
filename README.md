# RepoLens MCP

> Give AI agents a safe lens into your codebase.

[![Report an issue](https://img.shields.io/badge/Report%20an%20issue-GitHub-blue?logo=github)](https://github.com/jupiter-ai0211/repolens-mcp/issues)
&nbsp;[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

RepoLens MCP is a VS Code extension that ships a local [Model Context
Protocol](https://modelcontextprotocol.io) server called **`repolens`**. It gives
VS Code AI agents focused, **read-only** tools to inspect a project: structure,
scripts, `.env` gaps, TODOs, framework detection, and large files — without
unrestricted shell access.

## Demo

A 10-second look at RepoLens answering codebase questions inside Cursor:

![RepoLens MCP in action — Cursor agent using RepoLens tools to inspect a repo](https://raw.githubusercontent.com/jupiter-ai0211/repolens-mcp/v0.1.4/media/repolens_mcp_cursor_10s_demo.gif)

**The flow:** install the extension → open your repo → ask the Cursor agent a
question (e.g. *"Use RepoLens to give me a project overview"*) → it answers using
local, read-only context.

## Features

- **Project overview** – structure and important-file signals at a glance
- **Package script inspection** – package manager + how to run/build/test/lint
- **`.env` safety checks** – compare `.env` and `.env.example` by **keys only**
- **TODO/FIXME scanner** – find `TODO`/`FIXME`/`HACK`/`XXX`/`BUG`/`SECURITY`
- **Framework detection** – React, Next.js, Vite, NestJS, Laravel, Django, Docker…
- **Large file detection** – spot files that bloat diffs and slow agents

## Why RepoLens?

AI coding agents often need project context, but full terminal access is risky.
RepoLens provides safe, structured, limited project inspection instead.

**No shell execution. No secret values. Just safe project context.**

## Available MCP Tools

| Tool | Description |
| --- | --- |
| `get_project_overview` | Summarizes workspace structure and important files |
| `inspect_package_scripts` | Shows the package manager and available scripts |
| `compare_env_files` | Compares `.env` and `.env.example` without leaking values |
| `find_todos` | Finds `TODO`/`FIXME`/`HACK`/`XXX`/`BUG`/`SECURITY` comments |
| `detect_project_stack` | Detects languages, frameworks, and tooling |
| `find_large_files` | Finds large files (metadata only) |

## How it works

The extension registers an MCP server definition provider
(`contributes.mcpServerDefinitionProviders` in `package.json` +
`vscode.lm.registerMcpServerDefinitionProvider` in code). When VS Code asks for
definitions, RepoLens returns one local **stdio** server:

```text
label:   RepoLens MCP
command: node
args:    dist/server/index.js
cwd:     workspace root
env:     REPOLENS_WORKSPACE_ROOT = <workspace root>
```

The server speaks JSON-RPC over stdio. Only the MCP transport writes to stdout;
all logs go to stderr.

## Safety

RepoLens is read-only by default. It:

- never executes shell commands;
- never writes files;
- never returns secret values (env comparisons return **keys only**);
- blocks paths outside the workspace (including `..` traversal and symlink escapes);
- ignores dependency/build/cache folders (`node_modules`, `.git`, `dist`, …);
- skips binary and oversized files;
- hard-limits result sizes and returns compact structured JSON.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `repolens.maxResults` | `100` | Max results returned by scanning tools |
| `repolens.maxFileSizeKb` | `1024` | Max file size (KB) RepoLens will read |
| `repolens.ignoreDirectories` | `["node_modules", ".git", "dist", "build"]` | Extra directories to ignore |
| `repolens.enableExperimentalTools` | `false` | Enable experimental tools |

## Development

```bash
npm install
npm run build      # compile TypeScript to dist/
npm run test       # run the Vitest suite
npm run lint       # run ESLint
npm run package    # build a .vsix with @vscode/vsce
```

Press `F5` in VS Code to launch an Extension Development Host, open a sample
workspace, then start **RepoLens MCP** from the MCP server management UI and ask
your agent things like *"Use RepoLens to summarize this repo"* or *"Use RepoLens
to compare my env files"*.

## Reporting issues

Found a bug or have a feature request? Please
[open an issue on GitHub](https://github.com/jupiter-ai0211/repolens-mcp/issues).

To help us reproduce and fix it faster, include:

- your VS Code / Cursor version and OS;
- the RepoLens MCP extension version;
- the steps to reproduce (and the tool or prompt you used);
- what you expected vs. what actually happened.

## License

[MIT](./LICENSE)

## Star this project

If RepoLens MCP is useful to you, please consider supporting it:

- ⭐ [Star the repo on GitHub](https://github.com/jupiter-ai0211/repolens-mcp) — it helps others discover the project.
- 👍 Rate and review the extension on the [Open VSX Registry](https://open-vsx.org/extension/jupiter-ai0211/repolens-mcp) (used by Cursor).
- 📣 Share it with teammates who give AI agents access to their codebase.

Every star and review keeps the project growing. Thank you!
