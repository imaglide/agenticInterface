# Agentic Interface

**Context-aware component selection system.**

This project implements an **agent-driven UI** where the interface adapts to the user's context (calendar, meeting state, intent) rather than forcing the user to navigate through menus. It prioritizes stability, flow, and "calm" computing.

## 🚀 Quick Start

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://http://agentic.test](http://http://agentic.test) (or the port shown in your terminal).

## ✨ Key Features

-   **Context-First UI**: The application automatically switches modes based on your calendar and current activity.
    -   **Neutral/Intent**: When no meetings are imminent, set your intention.
    -   **Meeting Prep**: 45 mins before a meeting, get a focused prep view.
    -   **Meeting Capture**: During a meeting, capture key markers (Decisions, Actions, Risks, Questions) without distraction.
    -   **Synthesis**: Immediately after a meeting, close the loop with a summary view.
-   **No Menus**: Navigation is handled by the "Agent" (Rules Engine).
-   **Decision Clarity**: Ask "Why this view?" to see exactly why a specific UI was chosen.

## 🏗️ Architecture

The system operates on a loop:
1.  **Context**: Reads calendar state and time.
2.  **Rules Engine**: Determines the appropriate `Mode` and `Confidence` level.
3.  **Plan**: Selects a static UI Plan (JSON) from a finite registry.
4.  **Renderer**: Renders the components defined in the plan. Used components are strictly defined in the `ComponentRegistry`.

## 📚 Documentation

Detailed documentation is available in the [`docs/`](./docs) directory:

-   **[Project Rules & Info](./CLAUDE.md)**: technical constraints and handy commands.
-   **[Full Specification](./docs/agentic_interface_v1.md)**: The V1 design spec.
-   **[Project Status](./docs/STATUS.md)**: Current completion status and active phases.
-   **[Implementation Phases](./docs/phases/)**: detailed breakdown of the development roadmap.

## 🚦 Status

**Current Phase: Phase H (Founder Test)**

The core V1 infrastructure is complete (~90%). The project is currently in the validation phase.
See [STATUS.md](./docs/STATUS.md) for the latest details.
