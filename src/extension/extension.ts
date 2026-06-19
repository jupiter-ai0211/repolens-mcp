import * as vscode from "vscode";
import { registerMcpProvider } from "./registerMcpProvider.js";

let output: vscode.LogOutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("RepoLens MCP", { log: true });
  context.subscriptions.push(output);

  output.info("RepoLens MCP extension activated.");

  if (!vscode.lm || typeof vscode.lm.registerMcpServerDefinitionProvider !== "function") {
    output.error(
      "This VS Code version does not support MCP server definition " +
        "providers. Please update to VS Code 1.101 or later.",
    );
    void vscode.window.showErrorMessage(
      "RepoLens MCP requires VS Code 1.101 or later (MCP API not available).",
    );
    return;
  }

  registerMcpProvider(context, output);
  output.info("RepoLens MCP server provider registered.");
}

export function deactivate(): void {
  output?.info("RepoLens MCP extension deactivated.");
}
