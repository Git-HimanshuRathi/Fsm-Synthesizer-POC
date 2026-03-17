/**
 * StateEncoder — Converts symbolic state names into binary codes.
 *
 * Given N states, we need ceil(log2(N)) flip-flops to represent them.
 * Each state gets a unique binary code.
 *
 * Example with 3 states:
 *   S0 → 00
 *   S1 → 01
 *   S2 → 10
 *   (11 is unused → becomes don't-care in minimization)
 */
export class StateEncoder {
    /**
     * @param {FSMGraph} fsm - The FSM to encode
     */
    constructor(fsm) {
        this.fsm = fsm;
        this.encoding = {};   // stateId → binary string (e.g., "01")
        this.numBits = 0;     // Number of flip-flops needed
        this.numStates = fsm.states.length;
    }

    /**
     * Perform binary (sequential) encoding.
     * Returns the encoding map.
     */
    encode() {
        const n = this.numStates;

        // Number of flip-flops = ceil(log2(n))
        // Special case: 1 state needs 1 bit, 2 states need 1 bit
        this.numBits = n <= 1 ? 1 : Math.ceil(Math.log2(n));

        // Assign sequential binary codes to each state
        for (let i = 0; i < this.fsm.states.length; i++) {
            const state = this.fsm.states[i];
            // Convert index to binary string, padded to numBits
            this.encoding[state.id] = i.toString(2).padStart(this.numBits, '0');
        }

        return this.encoding;
    }

    /**
     * Get the binary code for a state.
     */
    getCode(stateId) {
        return this.encoding[stateId];
    }

    /**
     * Get all unused binary codes (these become don't-cares).
     * E.g., with 3 states and 2 bits, code "11" is unused.
     */
    getUnusedCodes() {
        const totalCodes = Math.pow(2, this.numBits);
        const usedCodes = new Set(Object.values(this.encoding));
        const unused = [];

        for (let i = 0; i < totalCodes; i++) {
            const code = i.toString(2).padStart(this.numBits, '0');
            if (!usedCodes.has(code)) {
                unused.push(code);
            }
        }

        return unused;
    }

    /**
     * Return a readable summary of the encoding.
     */
    getSummary() {
        return {
            numStates: this.numStates,
            numBits: this.numBits,
            encoding: { ...this.encoding },
            unusedCodes: this.getUnusedCodes(),
        };
    }
}
