export class TransitionTable {
    constructor(fsm, encoder) {
        this.fsm = fsm;
        this.encoder = encoder;
        this.rows = [];        // Array of row objects
        this.numStateBits = encoder.numBits;
        this.numInputBits = fsm.inputNames.length;
        this.numOutputBits = fsm.outputNames.length;
    }

    build() {
        this.rows = [];

        const totalStateCombinations = Math.pow(2, this.numStateBits);
        const totalInputCombinations = Math.pow(2, this.numInputBits);
        const unusedCodes = new Set(this.encoder.getUnusedCodes());

        // For every possible (state, input) combination...
        for (let stateVal = 0; stateVal < totalStateCombinations; stateVal++) {
            const stateBits = stateVal.toString(2).padStart(this.numStateBits, '0');

            for (let inputVal = 0; inputVal < totalInputCombinations; inputVal++) {
                const inputBits = inputVal.toString(2).padStart(this.numInputBits, '0');

                // If this state code is unused, mark everything as don't-care
                if (unusedCodes.has(stateBits)) {
                    this.rows.push({
                        currentState: stateBits,
                        input: inputBits,
                        nextState: 'X'.repeat(this.numStateBits),
                        output: 'X'.repeat(this.numOutputBits),
                        isDontCare: true,
                    });
                    continue;
                }

                // Find which FSM state has this binary code
                const currentStateId = this._findStateByCode(stateBits);
                if (!currentStateId) {
                    // Shouldn't happen if encoding is correct
                    continue;
                }

                // Find the transition that matches this input
                const transition = this._findTransition(currentStateId, inputBits);

                if (!transition) {
                    // Missing transition → treat as don't-care
                    this.rows.push({
                        currentState: stateBits,
                        input: inputBits,
                        nextState: 'X'.repeat(this.numStateBits),
                        output: 'X'.repeat(this.numOutputBits),
                        isDontCare: true,
                    });
                    continue;
                }

                // Get next state binary code
                const nextStateBits = this.encoder.getCode(transition.to);

                // Get output bits
                const outputBits = this._getOutputBits(currentStateId, transition);

                this.rows.push({
                    currentState: stateBits,
                    input: inputBits,
                    nextState: nextStateBits,
                    output: outputBits,
                    isDontCare: false,
                });
            }
        }

        return this.rows;
    }

    _findStateByCode(code) {
        for (const [stateId, stateCode] of Object.entries(this.encoder.encoding)) {
            if (stateCode === code) return stateId;
        }
        return null;
    }

    _findTransition(stateId, inputBits) {
        return this.fsm.transitions.find(
            t => t.from === stateId && t.input === inputBits
        ) || null;
    }

    _getOutputBits(currentStateId, transition) {
        let bits = '';

        for (const outName of this.fsm.outputNames) {
            if (this.fsm.type === 'moore') {
                // Moore: output depends only on current state
                const state = this.fsm.getState(currentStateId);
                const val = state.outputs[outName];
                bits += (val !== undefined) ? String(val) : '0';
            } else {
                // Mealy: output depends on transition
                const val = transition.outputs[outName];
                bits += (val !== undefined) ? String(val) : '0';
            }
        }

        return bits;
    }

    getSummary() {
        const stateLabels = [];
        for (let i = 0; i < this.numStateBits; i++) {
            stateLabels.push(`Q${i}`);
        }

        return {
            columns: {
                currentState: stateLabels,
                inputs: [...this.fsm.inputNames],
                nextState: stateLabels.map(q => `${q}+`),
                outputs: [...this.fsm.outputNames],
            },
            rows: this.rows.map(r => ({
                ...r,
                // Decimal index for easier reading
                rowIndex: parseInt(r.currentState + r.input, 2),
            })),
            totalRows: this.rows.length,
            dontCareRows: this.rows.filter(r => r.isDontCare).length,
        };
    }
}
