import * as vscode from "vscode";
import { registerMcpProvider } from "./registerMcpProvider.js";
import { registerCursorMcp } from "./registerCursorMcp.js";

let output: vscode.LogOutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("RepoLens MCP", { log: true });
  context.subscriptions.push(output);

  output.info("RepoLens MCP extension activated.");

  let registered = false;

  // Path 1: VS Code's finalized MCP server definition provider API (1.101+).
  const lm = (vscode as unknown as { lm?: { registerMcpServerDefinitionProvider?: unknown } }).lm;
  if (lm && typeof lm.registerMcpServerDefinitionProvider === "function") {
    registerMcpProvider(context, output);
    output.info("RepoLens registered via the VS Code MCP provider API.");
    registered = true;
  }

  // Path 2: Cursor's extension MCP API. Cursor does not implement the VS Code
  // provider API above, so this is how the server auto-registers in Cursor
  // without the user editing any mcp.json file.
  if (registerCursorMcp(context, output)) {
    output.info("RepoLens registered via the Cursor MCP extension API.");
    registered = true;
  }

  if (!registered) {
    output.error(
      "This editor exposes neither the VS Code MCP provider API nor the " +
        "Cursor MCP extension API, so RepoLens could not register its server. " +
        "Update to VS Code 1.101+ or a recent Cursor build.",
    );
    void vscode.window.showErrorMessage(
      "RepoLens MCP could not register: this editor lacks a supported MCP " +
        "extension API (needs VS Code 1.101+ or a recent Cursor).",
    );
  }
}

export function deactivate(): void {
  output?.info("RepoLens MCP extension deactivated.");
}
