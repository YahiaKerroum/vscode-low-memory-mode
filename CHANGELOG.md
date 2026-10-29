# Changelog

## 0.2.0
- Two levels: **Standard** (nothing visible changes) and **Max** (also turns off Python IntelliSense, Git, CodeLens,
  inlay hints and breadcrumbs).
- **Free Memory Now**: closes editor tabs without unsaved changes; can restart the extension host after confirmation.
- **Memory Report**: the programs using the most memory, and how much is free.
- Standard also limits Python analysis to open files, caps the TypeScript server at 1 GB, and turns off npm/task
  auto-detection, debugger auto-attach, port forwarding, update checks, experiments, telemetry and terminal GPU
  acceleration.

## 0.1.0
- First version: toggle memory-saving settings and restore the previous ones.
