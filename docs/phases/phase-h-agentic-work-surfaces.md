# Phase H — Agentic Work Surfaces

## Overview
**Goal:** Build the "doing" layer of the interface. Move beyond meeting context into actual work execution by compiling user intent into specific, disposable workspaces.

## Scope
From Design Checklist §23:

- [ ] Intent → workspace compiler
- [ ] Clarification loop (max 1–2 questions)
- [ ] Data ingest panel (upload/connectors)
- [ ] Lens selection (compliance/risk/etc.)
- [ ] Interactive table/canvas
- [ ] Insights grounded in data
- [ ] Universal WorkObject interaction reused
- [ ] Work surfaces are disposable (snapshots optional)

## Dependencies
- Phase F (Rules Engine) - Completed
- Phase A/B (UI/Components) - Completed

## Detailed Plan (Draft)

### 1. Intent Compilation
- Transform natural language intent ("Analyze Q3 sales") into a structured `WorkspaceDefinition`.
- Use `decision_capsule` logic to explain *why* a specific workspace tool was chosen.

### 2. Workspace Components
- **DataGrid:** High-performance editable table.
- **Canvas:** Infinite whitespace for loose notes/diagrams.
- **Document:** Rich text editor with embedded WorkObjects.

### 3. Ingestion Pipeline
- Drag-and-drop file upload.
- Connector framework (initially just mock/local).

## Next Steps
- [ ] Refine technical spec for Workspace Compiler.
- [ ] Design "Lens" system for viewing data.
