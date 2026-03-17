/**
 * FSMTransition — Represents a transition (edge) between two states.
 *
 * Each transition has:
 *  - from:     source state id
 *  - to:       destination state id
 *  - input:    input condition as a string (e.g., "0", "1", "01")
 *  - outputs:  Mealy outputs — map of output name → value (only used in Mealy mode)
 */
export class FSMTransition {
    constructor(from, to, input) {
        this.from = from;
        this.to = to;
        this.input = input;   // e.g., "1" or "01" for multi-bit input
        this.outputs = {};    // Mealy: { "Z": 1 }
    }

    /**
     * Set Mealy output values for this transition.
     * @param {Object} outputs - e.g., { Z: 1 }
     */
    setOutputs(outputs) {
        this.outputs = { ...outputs };
    }

    /**
     * Get a display label for the transition arrow.
     * Moore:  just shows input  →  "X=1"
     * Mealy:  shows input/output →  "X=1 / Z=0"
     */
    getLabel(inputNames = [], outputNames = []) {
        // Build input part
        const inputParts = [];
        for (let i = 0; i < this.input.length; i++) {
            const name = inputNames[i] || `I${i}`;
            inputParts.push(`${name}=${this.input[i]}`);
        }

        // Build output part (Mealy only)
        const outputParts = [];
        for (const name of outputNames) {
            if (this.outputs[name] !== undefined) {
                outputParts.push(`${name}=${this.outputs[name]}`);
            }
        }

        if (outputParts.length > 0) {
            return `${inputParts.join(",")} / ${outputParts.join(",")}`;
        }
        return inputParts.join(",");
    }

    /**
     * Convert to plain object for serialization.
     */
    toJSON() {
        return {
            from: this.from,
            to: this.to,
            input: this.input,
            outputs: { ...this.outputs },
        };
    }
}
