# FSM Synthesizer PoC

**Proof of Concept** for the FSM Editor & Synthesizer feature in [CircuitVerse](https://github.com/CircuitVerse/CircuitVerse).

## What This Contains

FSM-specific files extracted from the CircuitVerse `feature/fsm-synthesizer-poc` branch:

### Core FSM Classes (`simulator/src/fsm/`)

- **FSM.js** — Main finite state machine model
- **FSMState.js** — State node representation
- **FSMTransition.js** — Transition/edge representation
- **ContextMenu.js** — Right-click context menu for FSM canvas
- **UndoHistory.js** — Undo/redo stack for FSM edits

### Editor & Synthesizer (`simulator/src/`)

- **fsmEditor.js** — Canvas-based FSM editor UI
- **fsmSynthesizer.js** — FSM → circuit synthesis logic
- **fsmEditor.css** — Editor styles
- **setup.js** — Simulator setup (modified for FSM integration)
- **data.js** — Data layer (modified for FSM integration)

### View

- **edit.html.erb** — Simulator view with FSM editor integration

## Original Branch

These files come from the [`feature/fsm-synthesizer-poc`](https://github.com/CircuitVerse/CircuitVerse/tree/feature/fsm-synthesizer-poc) branch of CircuitVerse.
