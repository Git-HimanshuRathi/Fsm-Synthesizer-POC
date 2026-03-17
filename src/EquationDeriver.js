export class EquationDeriver {
    constructor(table, fsm) {
        this.table = table;
        this.fsm = fsm;
        this.functions = [];  // Array of { name, minterms, dontCares, numVars }
    }

    derive() {
        this.functions = [];

        const numStateBits = this.table.numStateBits;
        const numOutputBits = this.table.numOutputBits;

        // Total input variables = state bits + input bits
        const numVars = numStateBits + this.table.numInputBits;

        // --- Next-state functions (one per state bit) ---
        for (let bit = 0; bit < numStateBits; bit++) {
            const name = `Q${bit}+`;
            const { minterms, dontCares } = this._extractColumn(
                row => row.nextState,
                bit,
                numVars
            );
            this.functions.push({ name, minterms, dontCares, numVars });
        }

        // --- Output functions (one per output signal) ---
        for (let bit = 0; bit < numOutputBits; bit++) {
            const name = this.fsm.outputNames[bit] || `Z${bit}`;
            const { minterms, dontCares } = this._extractColumn(
                row => row.output,
                bit,
                numVars
            );
            this.functions.push({ name, minterms, dontCares, numVars });
        }

        return this.functions;
    }

    _extractColumn(getColumn, bitIndex, numVars) {
        const minterms = [];
        const dontCares = [];

        for (const row of this.table.rows) {
            // The row index is the decimal value of (currentState + input)
            const rowIndex = parseInt(row.currentState + row.input, 2);
            const columnValue = getColumn(row);

            if (row.isDontCare || columnValue[bitIndex] === 'X') {
                dontCares.push(rowIndex);
            } else if (columnValue[bitIndex] === '1') {
                minterms.push(rowIndex);
            }
            // '0' → not a minterm, just skip
        }

        return { minterms, dontCares };
    }

    getSummary() {
        return this.functions.map(fn => ({
            name: fn.name,
            numVars: fn.numVars,
            minterms: fn.minterms,
            dontCares: fn.dontCares,
            mintermStr: fn.minterms.length > 0
                ? `Σm(${fn.minterms.join(', ')})`
                : 'Σm(∅)',
            dontCareStr: fn.dontCares.length > 0
                ? `+ d(${fn.dontCares.join(', ')})`
                : '',
        }));
    }
}
