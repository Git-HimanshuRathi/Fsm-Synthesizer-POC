export class FSMState {
    constructor(id, label, x, y) {
        this.id = id;
        this.label = label;
        this.x = x;
        this.y = y;
        this.isInitial = false;
        this.outputs = {}; // Moore: { "Z": 0 }
    }

    setOutputs(outputs) {
        this.outputs = { ...outputs };
    }

    setInitial(value = true) {
        this.isInitial = value;
    }

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
