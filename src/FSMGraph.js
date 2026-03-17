import { FSMState } from './FSMState.js';
import { FSMTransition } from './FSMTransition.js';

export class FSMGraph {
    constructor() {
        this.type = 'moore';      // 'moore' or 'mealy'
        this.states = [];          // Array of FSMState
        this.transitions = [];     // Array of FSMTransition
        this.inputNames = ['X'];   // Names of input signals
        this.outputNames = ['Z'];  // Names of output signals
        this._nextId = 0;          // Auto-increment for state IDs
    }

    // ── State management ────────────────────────────────────────

    addState(x, y) {
        const id = `S${this._nextId}`;
        const label = `S${this._nextId}`;
        this._nextId++;

        const state = new FSMState(id, label, x, y);

        // First state added becomes the initial state automatically
        if (this.states.length === 0) {
            state.setInitial(true);
        }

        this.states.push(state);
        return state;
    }

    removeState(stateId) {
        this.states = this.states.filter(s => s.id !== stateId);
        this.transitions = this.transitions.filter(
            t => t.from !== stateId && t.to !== stateId
        );
    }

    getState(stateId) {
        return this.states.find(s => s.id === stateId) || null;
    }

    setInitialState(stateId) {
        for (const state of this.states) {
            state.setInitial(state.id === stateId);
        }
    }

    getInitialState() {
        return this.states.find(s => s.isInitial) || null;
    }

    // ── Transition management ───────────────────────────────────

    addTransition(fromId, toId, input) {
        const transition = new FSMTransition(fromId, toId, input);
        this.transitions.push(transition);
        return transition;
    }

    removeTransition(index) {
        this.transitions.splice(index, 1);
    }

    getTransitionsFrom(stateId) {
        return this.transitions.filter(t => t.from === stateId);
    }

    // ── Validation ──────────────────────────────────────────────

    validate() {
        const errors = [];
        const warnings = [];

        // Need at least 2 states
        if (this.states.length < 2) {
            errors.push('FSM must have at least 2 states.');
        }

        // Must have an initial state
        if (!this.getInitialState()) {
            errors.push('No initial state is set.');
        }

        // Must have at least one transition
        if (this.transitions.length === 0) {
            errors.push('FSM has no transitions defined.');
        }

        // Check for duplicate state names
        const names = new Set();
        for (const s of this.states) {
            if (names.has(s.label)) {
                errors.push(`Duplicate state name: "${s.label}".`);
            }
            names.add(s.label);
        }

        // Check for non-deterministic transitions
        // (same state + same input → two different destinations)
        for (const state of this.states) {
            const outgoing = this.getTransitionsFrom(state.id);
            const inputsSeen = new Set();
            for (const t of outgoing) {
                if (inputsSeen.has(t.input)) {
                    errors.push(
                        `Non-deterministic: state "${state.label}" has multiple transitions for input "${t.input}".`
                    );
                }
                inputsSeen.add(t.input);
            }
        }

        // Check for states with no outgoing transitions (warning)
        for (const state of this.states) {
            const outgoing = this.getTransitionsFrom(state.id);
            if (outgoing.length === 0) {
                warnings.push(`State "${state.label}" has no outgoing transitions (dead-end).`);
            }
        }

        // Check for unreachable states (BFS from initial)
        const initial = this.getInitialState();
        if (initial && this.states.length > 1) {
            const reachable = new Set();
            const queue = [initial.id];
            reachable.add(initial.id);

            while (queue.length > 0) {
                const current = queue.shift();
                for (const t of this.getTransitionsFrom(current)) {
                    if (!reachable.has(t.to)) {
                        reachable.add(t.to);
                        queue.push(t.to);
                    }
                }
            }

            for (const state of this.states) {
                if (!reachable.has(state.id)) {
                    warnings.push(`State "${state.label}" is unreachable from the initial state.`);
                }
            }
        }

        // Check Moore outputs are defined
        if (this.type === 'moore') {
            for (const state of this.states) {
                for (const outName of this.outputNames) {
                    if (state.outputs[outName] === undefined) {
                        warnings.push(
                            `Moore output "${outName}" not set for state "${state.label}" (defaults to 0).`
                        );
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    // ── Serialization ───────────────────────────────────────────

    toJSON() {
        return {
            type: this.type,
            inputs: [...this.inputNames],
            outputs: [...this.outputNames],
            states: this.states.map(s => s.toJSON()),
            transitions: this.transitions.map(t => t.toJSON()),
        };
    }
}
