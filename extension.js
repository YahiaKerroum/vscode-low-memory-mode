// Low Memory Mode: applies memory-saving settings to the open workspace (or to the user settings when no folder is
// open) and remembers the previous values, so turning it off restores exactly what was there before.
// Two levels: "standard" keeps every feature you see; "max" also turns off Python IntelliSense, Git and other helpers.
// Plus two actions: free memory now (close unchanged tabs, optionally restart the extension host) and a memory report.
const vscode = require("vscode");
const cp = require("child_process");

const HEAVY = [".venv", "venv", "node_modules", ".next", "__pycache__", ".git/objects", "dist", "build", ".mypy_cache",
  ".pytest_cache", ".ipynb_checkpoints", "target", ".gradle"];
const SAVED = "lowMemoryMode.saved";        // { key: previous value at the target scope, or null when unset }
const LEVEL = "lowMemoryMode.level";

function standardSettings() {
  const extra = vscode.workspace.getConfiguration("lowMemoryMode").get("extraFolders", []);
  const folders = [...HEAVY, ...extra];
  const globs = (suffix) => Object.fromEntries(folders.map((f) => [`**/${f}${suffix}`, true]));
  return {
    // stop watching, searching and indexing heavy folders
    "files.watcherExclude": globs("/**"),
    "search.exclude": globs(""),
    "search.followSymlinks": false,
    "python.analysis.indexing": false,
    "python.analysis.exclude": folders.map((f) => `**/${f}`),
    "python.analysis.diagnosticMode": "openFilesOnly",
    "typescript.tsserver.maxTsServerMemory": 1024,
    "typescript.disableAutomaticTypeAcquisition": true,
    "typescript.tsserver.experimental.enableProjectDiagnostics": false,
    // no background jobs
    "jupyter.disableJupyterAutoStart": true,
    "git.autorefresh": false,
    "git.autofetch": false,
    "npm.autoDetect": "off",
    "task.autoDetect": "off",
    "debug.javascript.autoAttachFilter": "disabled",
    "remote.autoForwardPorts": false,
    "extensions.autoCheckUpdates": false,
    "extensions.autoUpdate": false,
    "update.mode": "manual",
    "workbench.enableExperiments": false,
    "telemetry.telemetryLevel": "off",
    // less to draw and keep in memory
    "editor.minimap.enabled": false,
    "workbench.editor.limit.enabled": true,
    "workbench.editor.limit.value": 8,
    "workbench.startupEditor": "none",
    "terminal.integrated.gpuAcceleration": "off",
    "terminal.integrated.scrollback": 500,
  };
}

function maxSettings() {
  return {
    ...standardSettings(),
    // these turn off things you will notice: completions in Python, the Source Control view, hints in the editor
    "python.languageServer": "None",
    "git.enabled": false,
    "editor.codeLens": false,
    "editor.semanticHighlighting.enabled": false,
    "editor.inlayHints.enabled": "off",
    "editor.occurrencesHighlight": "off",
    "editor.hover.delay": 1500,
    "breadcrumbs.enabled": false,
    "workbench.editor.limit.value": 4,
    "terminal.integrated.scrollback": 200,
  };
}

function target() {
  return vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
}

function store(context) {
  return target() === vscode.ConfigurationTarget.Workspace ? context.workspaceState : context.globalState;
}

function currentValue(key) {
  const i = vscode.workspace.getConfiguration().inspect(key);
  const v = target() === vscode.ConfigurationTarget.Workspace ? i.workspaceValue : i.globalValue;
  return v === undefined ? null : v;
}

function level(context) {
  return store(context).get(SAVED) === undefined ? null : store(context).get(LEVEL, "standard");
}

async function apply(context, status, wanted) {
  const now = level(context);
  if (now === wanted) {
    vscode.window.showInformationMessage(`Low memory mode (${wanted}) is already on.`);
    return;
  }
  if (now) await restore(context);                      // switching levels: start again from your own settings
  const settings = wanted === "max" ? maxSettings() : standardSettings();
  const saved = {};
  for (const key of Object.keys(settings)) saved[key] = currentValue(key);
  await store(context).update(SAVED, saved);
  await store(context).update(LEVEL, wanted);
  const config = vscode.workspace.getConfiguration();
  for (const [key, value] of Object.entries(settings)) {
    const before = saved[key];
    const merged = before && typeof before === "object" && !Array.isArray(before) ? { ...before, ...value } : value;
    try { await config.update(key, merged, target()); } catch (e) { /* setting of an extension that is not installed */ }
  }
  show(context, status);
  offerReload(`Low memory mode (${wanted}) is on.`);
}

async function restore(context) {
  const saved = store(context).get(SAVED);
  const config = vscode.workspace.getConfiguration();
  for (const [key, before] of Object.entries(saved || {})) {
    try { await config.update(key, before === null ? undefined : before, target()); } catch (e) { /* see above */ }
  }
  await store(context).update(SAVED, undefined);
  await store(context).update(LEVEL, undefined);
}

async function turnOff(context, status) {
  if (!level(context)) {
    vscode.window.showInformationMessage("Low memory mode is already off.");
    return;
  }
  await restore(context);
  show(context, status);
  offerReload("Low memory mode is off; your previous settings are back.");
}

async function offerReload(message) {
  const pick = await vscode.window.showInformationMessage(`${message} Reload the window to apply it fully.`, "Reload Window");
  if (pick) vscode.commands.executeCommand("workbench.action.reloadWindow");
}

async function freeNow() {
  await vscode.commands.executeCommand("workbench.action.closeUnmodifiedEditors");
  const pick = await vscode.window.showWarningMessage(
    "Closed the editor tabs without unsaved changes. Also restart the extension host? It releases the memory " +
    "extensions have piled up, but it stops everything running inside extensions for a few seconds, including " +
    "AI chat sessions in the side panel (their work in progress is lost).",
    { modal: true }, "Restart Extension Host");
  if (pick) vscode.commands.executeCommand("workbench.action.restartExtensionHost");
}

function memoryReport(output) {
  if (process.platform !== "win32") {
    vscode.commands.executeCommand("workbench.action.openProcessExplorer");
    return;
  }
  const ps = "Get-Process | Group-Object ProcessName | ForEach-Object { '{0,-28} {1,4} {2,8:N0} MB' -f $_.Name, " +
    "$_.Count, (($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB) } | Sort-Object { [double](($_ -split '\\s+')[-2] -replace ',','') } -Descending | Select-Object -First 15;" +
    "$os = Get-CimInstance Win32_OperatingSystem; '';" +
    "'free: {0:N0} MB of {1:N0} MB' -f ($os.FreePhysicalMemory / 1KB), ($os.TotalVisibleMemorySize / 1KB)";
  cp.execFile("powershell", ["-NoProfile", "-Command", ps], { windowsHide: true }, (err, stdout) => {
    output.clear();
    output.appendLine("Programs using the most memory (name, processes, memory):");
    output.appendLine("");
    output.appendLine(err ? String(err) : stdout.trimEnd());
    output.appendLine("");
    output.appendLine("Tips: every AI chat panel holds its own process and helpers (often 300-500 MB each): close the ones");
    output.appendLine("you are not using. 'Low Memory Mode: Free Memory Now' closes unchanged tabs. Within VS Code,");
    output.appendLine("Help > Open Process Explorer shows which extension uses what.");
    output.show(true);
  });
}

function show(context, status) {
  const l = level(context);
  if (l) {
    status.text = l === "max" ? "$(dashboard) Low Mem: Max" : "$(dashboard) Low Mem";
    status.tooltip = `Low memory mode (${l}) is on: click to turn it off`;
    status.show();
  } else {
    status.hide();
  }
}

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  status.command = "lowMemoryMode.off";
  const output = vscode.window.createOutputChannel("Low Memory Mode");
  context.subscriptions.push(
    status, output,
    vscode.commands.registerCommand("lowMemoryMode.on", () => apply(context, status, "standard")),
    vscode.commands.registerCommand("lowMemoryMode.max", () => apply(context, status, "max")),
    vscode.commands.registerCommand("lowMemoryMode.off", () => turnOff(context, status)),
    vscode.commands.registerCommand("lowMemoryMode.toggle", () =>
      level(context) ? turnOff(context, status) : apply(context, status, "standard")),
    vscode.commands.registerCommand("lowMemoryMode.freeNow", freeNow),
    vscode.commands.registerCommand("lowMemoryMode.report", () => memoryReport(output)),
  );
  show(context, status);
}

function deactivate() {}

module.exports = { activate, deactivate };
