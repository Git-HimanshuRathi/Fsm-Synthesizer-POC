/**
 * FSMState — Represents a single state in the finite state machine.
 *
 * Each state has:
 *  - id:        unique identifier (e.g., "S0", "S1")
 *  - label:     display name
 *  - x, y:      position on the canvas
 *  - isInitial: whether this is the starting state
 *  - outputs:   Moore outputs — map of output name → value (e.g., { Z: 0 })
 */
export class FSMState {
    constructor(id, label, x, y) {
        this.id = id;
        this.label = label;
        this.x = x;
        this.y = y;
        this.isInitial = false;
        this.outputs = {}; // Moore: { "Z": 0 }
    }

    /**
     * Set Moore output values for this state.
     * @param {Object} outputs - e.g., { Z: 1 }
     */
    setOutputs(outputs) {
        this.outputs = { ...outputs };
    }

    /**
     * Mark this state as the initial state.
     */
    setInitial(value = true) {
        this.isInitial = value;
    }

    /**
     * Convert to plain object for serialization.
     */
    toJSON() {
        return {
            id: this.id,
            label: this.label,
            x: this.x,
            y: this.y,
            isInitial: this.isInitial,
            outputs: { ...this.outputs },
        };
    }
}
