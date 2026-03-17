import { FSMState } from './FSMState.js';
import { FSMTransition } from './FSMTransition.js';

/**
 * FSMGraph — The complete finite state machine model.
 *
 * Holds all states and transitions, and provides methods to
 * add/remove elements and validate the FSM before synthesis.
 *
 * Supports both Moore (outputs on states) and Mealy (outputs on transitions).
 */
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

    /**
     * Add a new state at position (x, y).
     * Returns the created state.
     */
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

    /**
     * Remove a state and all transitions connected to it.
     */
    removeState(stateId) {
        this.states = this.states.filter(s => s.id !== stateId);
        this.transitions = this.transitions.filter(
            t => t.from !== stateId && t.to !== stateId
        );
    }

    /**
     * Find a state by its ID.
     */
    getState(stateId) {
        return this.states.find(s => s.id === stateId) || null;
    }

    /**
     * Set which state is the initial state.
     * Clears the flag on all other states first.
     */
    setInitialState(stateId) {
        for (const state of this.states) {
            state.setInitial(state.id === stateId);
        }
    }

    /**
     * Get the initial state.
     */
    getInitialState() {
        return this.states.find(s => s.isInitial) || null;
    }

    // ── Transition management ───────────────────────────────────

    /**
     * Add a transition from one state to another.
     * @param {string} fromId  - source state ID
     * @param {string} toId    - destination state ID
     * @param {string} input   - input condition (e.g., "0" or "1")
     * Returns the created transition.
     */
    addTransition(fromId, toId, input) {
        const transition = new FSMTransition(fromId, toId, input);
        this.transitions.push(transition);
        return transition;
    }

    /**
     * Remove a specific transition.
     */
    removeTransition(index) {
        this.transitions.splice(index, 1);
    }

    /**
     * Get all transitions leaving a given state.
     */
    getTransitionsFrom(stateId) {
        return this.transitions.filter(t => t.from === stateId);
    }

    // ── Validation ──────────────────────────────────────────────

    /**
     * Validate the FSM before synthesis.
     * Returns { valid: boolean, errors: string[], warnings: string[] }
     */
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

    /**
     * Export the FSM as a plain JSON object.
     */
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
