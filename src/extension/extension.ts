import * as vscode from "vscode";
import { registerMcpProvider } from "./registerMcpProvider.js";

let output: vscode.LogOutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("RepoLens MCP", { log: true });
  context.subscriptions.push(output);

  output.info("RepoLens MCP extension activated.");

  // The finalized MCP server definition provider API ships in VS Code 1.101+.
  // We declare a lower engine for broader marketplace visibility (e.g. forks),
  // so probe for the API at runtime and degrade gracefully if it is missing.
  const lm = (vscode as unknown as { lm?: { registerMcpServerDefinitionProvider?: unknown } }).lm;
  if (!lm || typeof lm.registerMcpServerDefinitionProvider !== "function") {
    output.error(
      "This editor does not support MCP server definition providers. " +
        "Please update to VS Code 1.101 or later (or a fork with MCP API support).",
    );
    void vscode.window.showErrorMessage(
      "RepoLens MCP requires an editor with the MCP API (VS Code 1.101 or later).",
    );
    return;
  }

  registerMcpProvider(context, output);
  output.info("RepoLens MCP server provider registered.");
}

export function deactivate(): void {
  output?.info("RepoLens MCP extension deactivated.");
}
