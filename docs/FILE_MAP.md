# Project File Map

> **Goal**: Eliminate the need for keyword search by providing a structural guide to the codebase.

## 📂 Root Directory
- **`src/`**: Core application source code.
- **`docs/`**: Project documentation, plans, and archival records.
- **`e2e/`**: End-to-end tests (Playwright).
- **`public/`**: Static assets (images, fonts).
- **`scripts/`**: Utility scripts for maintenance or build tasks.
- **`package.json`**: Project dependencies and scripts.
- **`playwright.config.ts`**: Configuration for E2E testing.

---

## 📂 `src/` - Application Core

### 🔹 `app/` (Next.js App Router)
The entry point for the application's pages and API routes.
- **`page.tsx`**: The main application view. **Crucial**: This file contains the primary logic for the Agentic Interface flow.
- **`layout.tsx`**: The root layout wrapper (providers, global styles).
- **`globals.css`**: Global Tailwind/CSS styles.
- **`auth/`**: Authentication related routes.
- **`interview/`**: Routes related to the interview/context-gathering phase.

### 🔹 `storage/` (Persistence Layer)
Handles all data persistence, likely using IndexedDB for client-side storage of "Work Objects".
- **`db.ts`**: Database connection and initialization info.
- **`storage-api.ts`**: The main API for reading/writing data. Use this instead of raw DB calls.
- **`work-object-api.ts`**: Specific handling for Work Objects (the core data unit).
- **`work-object-types.ts`**: TypeScript definitions for Work Objects.
- **`quota-monitor.ts`**: Manages storage limits/quotas?
- **`hooks.ts`**: React hooks for subscribing to storage changes.

### 🔹 `compiler/` (Intent Compilation)
Translates user natural language into structured workspace definitions.
- **`mock-compiler.ts`**: Current implementation of the Intent Compiler. It parses prompts into `WorkspaceDef`.
- **`types.ts`**: Definitions for Compiler outputs.

### 🔹 `workspaces/` (Dynamic Work Surfaces)
Renders the actual interactive components based on the Compiler's output.
- **`WorkspaceRenderer.tsx`**: The main component that takes a `WorkspaceDef` and renders the appropriate UI (Grid, Canvas, Doc).
- **`components.tsx`**: Specific sub-components for workspaces.

### 🔹 `components/` (UI Library)
Reusable React components.
- *(Contains standard UI elements like Buttons, Inputs, Dialogs, etc.)*

### 🔹 `contexts/`
Global React Contexts for state management.
- *(likely contains UserContext, ThemeContext, etc.)*

### 🔹 `rules/` (Logic Engine)
Manages dynamic business rules and core logic for the agent.
- **`rules-engine.ts`**: The central engine that evaluates rules against the current context.
- **`mode-selector.ts`**: Determines which "Mode" (e.g., Planning, Interview, Execution) the agent should be in.
- **`context-engine.ts`**: Handles context aggregation and management.
- **`capsule-generator.ts`**: *(Purpose TBD - possibly generating isolated context capsules)*

### 🔹 `plans/`
- **`static-plans.ts`**: Contains predefined or static execution plans used by the system.

### 🔹 `scenarios/`
Specific test or demo scenarios.
- **`intent-compilation.ts`**: A scenario specifically for testing the Intent Compiler flow.

### 🔹 `test-harness/` (Simulation Framework)
Tools for running complex simulations and scenarios, primarily for verification.
- **`scenarios.ts`**: Definitions of various test scenarios.
- **`scenario-loader.ts`**: Logic to load and prepare scenarios for execution.
- **`interview-runner.mjs`**: Script to execute interview simulations from the CLI.

---

## 📂 `docs/` - Knowledge Base
- **`phases/`**: Detailed implementation plans for each project phase.
- **`STATUS.md`**: Current project health and high-level progress.
- **`agentic_interface_v1.md`**: The core PRD/Spec for the V1 release.
- **`work_objects_and_agentic_work_surfaces.md`**: Conceptual guide to the data model.
