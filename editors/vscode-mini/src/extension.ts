import * as vscode from "vscode";

interface MiniDiagnostic {
  category: string;
  message: string;
  file: string;
  line: number;
  column: number;
  length: number;
  hint?: string;
  formatted: string;
}

interface CheckMiniResult {
  valid: boolean;
  diagnostics: MiniDiagnostic[];
}

// Load bundled Mini syntax checker engine
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { checkMini } = require("./mini-engine.cjs") as {
  checkMini: (source: string, file?: string) => CheckMiniResult;
};

export function activate(context: vscode.ExtensionContext): void {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("mini");
  context.subscriptions.push(diagnosticCollection);

  const validateDocument = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "mini") return;

    const result = checkMini(doc.getText(), doc.fileName);
    if (result.valid) {
      diagnosticCollection.set(doc.uri, []);
      return;
    }

    const vscodeDiagnostics: vscode.Diagnostic[] = result.diagnostics.map(
      (diag) => {
        const lineIndex = Math.max(0, diag.line - 1);
        const startCol = Math.max(0, diag.column - 1);
        const endCol = startCol + Math.max(1, diag.length);
        const range = new vscode.Range(lineIndex, startCol, lineIndex, endCol);

        const fullMessage = diag.hint
          ? `${diag.category}: ${diag.message}\nHint: ${diag.hint}`
          : `${diag.category}: ${diag.message}`;

        const d = new vscode.Diagnostic(
          range,
          fullMessage,
          vscode.DiagnosticSeverity.Error
        );
        d.source = "minilang";
        return d;
      }
    );

    diagnosticCollection.set(doc.uri, vscodeDiagnostics);
  };

  if (vscode.window.activeTextEditor) {
    validateDocument(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument((e) =>
      validateDocument(e.document)
    ),
    vscode.workspace.onDidSaveTextDocument(validateDocument),
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnosticCollection.delete(doc.uri)
    )
  );

  const runFileCmd = vscode.commands.registerCommand("mini.runFile", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "mini") {
      vscode.window.showWarningMessage("Open a .mini file first to run it.");
      return;
    }
    editor.document.save();
    const filePath = editor.document.fileName;
    const terminal =
      vscode.window.terminals.find((t) => t.name === "Mini") ??
      vscode.window.createTerminal("Mini");
    terminal.show();
    terminal.sendText(`minilang run "${filePath}"`);
  });

  const checkFileCmd = vscode.commands.registerCommand("mini.checkFile", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "mini") {
      vscode.window.showWarningMessage("Open a .mini file first to check it.");
      return;
    }
    validateDocument(editor.document);
    const currentDiags = diagnosticCollection.get(editor.document.uri);
    if (!currentDiags || currentDiags.length === 0) {
      vscode.window.showInformationMessage("Mini: No syntax errors found!");
    } else {
      vscode.window.showErrorMessage(
        `Mini: Found ${currentDiags.length} syntax error(s).`
      );
    }
  });

  context.subscriptions.push(runFileCmd, checkFileCmd);
}

export function deactivate(): void {
  // No cleanup required
}

