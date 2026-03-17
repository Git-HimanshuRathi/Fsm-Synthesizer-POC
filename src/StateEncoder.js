export class StateEncoder {
    constructor(fsm) {
        this.fsm = fsm;
        this.encoding = {};   // stateId → binary string (e.g., "01")
        this.numBits = 0;     // Number of flip-flops needed
        this.numStates = fsm.states.length;
    }

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

    getCode(stateId) {
        return this.encoding[stateId];
    }

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

    getSummary() {
        return {
            numStates: this.numStates,
            numBits: this.numBits,
            encoding: { ...this.encoding },
            unusedCodes: this.getUnusedCodes(),
        };
    }
}
