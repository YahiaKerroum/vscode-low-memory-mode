<p align="center">
  <img src="icon.png" width="96" alt="Low Memory Mode icon">
</p>

<h1 align="center">Low Memory Mode for VS Code</h1>

<p align="center">
  One command to make VS Code lighter. One command to put everything back exactly as it was.
</p>

---

VS Code does a lot of work you never see: it watches every file in your project, indexes virtual environments and
`node_modules`, runs language servers over the whole workspace, checks for updates, auto-detects tasks. On a laptop
with limited RAM, running alongside other heavy tools, that background work is often what pushes the machine into swap.

**Low Memory Mode** turns that background work off from the command palette, and turns it back on just as easily. It
never loses your configuration: when you switch it off, every setting it touched is restored to the exact value you had
before, including values you had never set.

## Features

- **Two levels.** *Standard* removes background work without changing anything you see or use. *Max* goes further
  and also turns off features you will notice (Python IntelliSense, Git integration, CodeLens).
- **Exact restore.** Previous values are saved per workspace and put back on *Turn Off*. Switching between levels
  restores first, so nothing stacks up.
- **Free Memory Now.** Closes editor tabs without unsaved changes, then offers to restart the extension host
  (releasing memory that extensions have accumulated), but only after you confirm.
- **Memory Report.** Lists the programs using the most memory on your machine and how much is free, so you can see
  what is actually worth closing.
- **Status bar indicator.** A *Low Mem* item shows while the mode is on; click it to turn the mode off.
- **Per-project folders.** List your project's own heavy folders (datasets, build outputs, caches) and they are
  excluded too.

## Usage

Open the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>, or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
on macOS) and run one of:

| Command | What it does |
|---|---|
| `Low Memory Mode: Turn On (Standard)` | Stops background work; every feature you use stays available |
| `Low Memory Mode: Turn On (Max)` | Standard, plus turns off the heavier features listed below |
| `Low Memory Mode: Turn Off` | Restores the settings you had before |
| `Low Memory Mode: Toggle` | Standard on / off |
| `Low Memory Mode: Free Memory Now` | Closes unmodified tabs; optionally restarts the extension host |
| `Low Memory Mode: Memory Report` | Shows the programs using the most memory |

After switching, the extension offers to reload the window, which applies the change fully.

## What each level changes

The settings are written to the open workspace (`.vscode/settings.json`), or to your user settings when no folder is
open.

### Standard

| Area | Change |
|---|---|
| File watching and search | Excludes `.venv`, `venv`, `node_modules`, `.next`, `__pycache__`, `.git/objects`, `dist`, `build`, `.mypy_cache`, `.pytest_cache`, `.ipynb_checkpoints`, `target`, `.gradle`, and the folders you list in `lowMemoryMode.extraFolders`; symlinks are not followed in search |
| Python (Pylance) | No workspace indexing; diagnostics for open files only; heavy folders excluded from analysis |
| TypeScript | Server memory capped at 1 GB; no automatic type acquisition; no project-wide diagnostics |
| Background jobs | No Jupyter auto-start, Git auto-refresh or auto-fetch, npm and task auto-detection, debugger auto-attach, or automatic port forwarding |
| Updates and telemetry | No automatic extension or VS Code update checks, no experiments, telemetry off |
| Interface | No minimap, no start page, at most 8 open editors; terminals without GPU acceleration and with a 500-line scrollback |

### Max

Everything in Standard, plus:

| Area | Change |
|---|---|
| Python | Language server off (no completions or go-to-definition in Python) |
| Git | Git integration off (no Source Control view) |
| Editor | No CodeLens, semantic highlighting, inlay hints, occurrence highlighting or breadcrumbs; slower hovers |
| Interface | At most 4 open editors; 200-line terminal scrollback |

## Configuration

| Setting | Default | Description |
|---|---|---|
| `lowMemoryMode.extraFolders` | `[]` | Extra folder names or paths (relative to the workspace) to exclude from watching, search and analysis while the mode is on |

Example `.vscode/settings.json` for a data-heavy project:

```json
{
  "lowMemoryMode.extraFolders": ["data", "outputs", "checkpoints", "logs"]
}
```

## Installation

**From the Marketplace:** search for *Low Memory Mode* in the Extensions view (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd>).

**From a release:** download the `.vsix` file from the
[Releases page](https://github.com/YahiaKerroum/vscode-low-memory-mode/releases), then run

```bash
code --install-extension low-memory-mode-0.2.0.vsix
```

## Good to know

- **The largest memory users are often not settings.** Every open AI chat panel, notebook kernel or language server
  is a process of its own, often several hundred MB each. The Memory Report shows them; closing the ones you are not
  using usually saves more than any setting.
- **Restarting the extension host** stops everything running inside extensions for a few seconds, including AI chat
  sessions in the side panel, whose work in progress is lost. The extension always asks first.
- **Settings of extensions you do not have** (for example Jupyter or Pylance) are skipped silently.
- **Changing the folder list** while the mode is on takes effect the next time you turn it on.

## Contributing

Issues and pull requests are welcome. The whole extension is a single dependency-free file, `extension.js`. To try a
change, open this folder in VS Code and press <kbd>F5</kbd> to launch an Extension Development Host. To build a package:

```bash
npx @vscode/vsce package
```

## License

[MIT](LICENSE) © 2026 Yahia Kerroum
