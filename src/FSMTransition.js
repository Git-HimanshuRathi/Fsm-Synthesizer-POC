export class FSMTransition {
    constructor(from, to, input) {
        this.from = from;
        this.to = to;
        this.input = input;   // e.g., "1" or "01" for multi-bit input
        this.outputs = {};    // Mealy: { "Z": 1 }
    }

    setOutputs(outputs) {
        this.outputs = { ...outputs };
    }

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

    toJSON() {
        return {
            from: this.from,
            to: this.to,
            input: this.input,
            outputs: { ...this.outputs },
        };
    }
}
