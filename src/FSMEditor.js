/**
 * FSMEditor — A minimal canvas-based FSM editor.
 *
 * Interactions:
 *   Double-click canvas  → create a new state
 *   Drag from state      → draw a transition to another state
 *   Click a state        → select it (shows properties panel)
 *   Right-click state    → set as initial / delete
 *   Click a transition   → select it for editing
 *
 * The editor works directly with an FSMGraph instance.
 */
export class FSMEditor {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {FSMGraph} fsm            - The FSM model
     * @param {Function} onUpdate       - Callback when FSM changes
     */
    constructor(canvas, fsm, onUpdate) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fsm = fsm;
        this.onUpdate = onUpdate || (() => {});

        // Visual constants
        this.STATE_RADIUS = 30;
        this.COLORS = {
            state: '#4a90d9',
            stateSelected: '#e67e22',
            initial: '#27ae60',
            text: '#ffffff',
            transition: '#555555',
            transitionSelected: '#e67e22',
            canvas: '#fafafa',
            grid: '#eeeeee',
        };

        // Interaction state
        this.selectedState = null;
        this.selectedTransition = null;
        this.dragging = null;        // state being dragged (moved)
        this.drawing = null;         // state we're drawing a transition FROM
        this.mousePos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };

        this._bindEvents();
        this.render();
    }

    // ── Event handling ──────────────────────────────────────────

    _bindEvents() {
        this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => this._onContextMenu(e));
    }

    _getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    /**
     * Double-click → create a new state at that position.
     */
    _onDoubleClick(e) {
        const pos = this._getMousePos(e);

        // Don't create on top of an existing state
        if (this._hitTestState(pos)) return;

        this.fsm.addState(pos.x, pos.y);
        this.onUpdate();
        this.render();
    }

    /**
     * Mouse down → start dragging a state or drawing a transition.
     */
    _onMouseDown(e) {
        if (e.button !== 0) return; // Left button only

        const pos = this._getMousePos(e);
        const hitState = this._hitTestState(pos);
        const hitTransition = this._hitTestTransition(pos);

        if (hitState) {
            if (e.shiftKey) {
                // Shift+click → start drawing a transition
                this.drawing = hitState;
                this.selectedState = null;
                this.selectedTransition = null;
            } else {
                // Normal click → select + start drag
                this.selectedState = hitState;
                this.selectedTransition = null;
                this.dragging = hitState;
                this.dragOffset = {
                    x: pos.x - hitState.x,
                    y: pos.y - hitState.y,
                };
            }
        } else if (hitTransition !== null) {
            this.selectedTransition = hitTransition;
            this.selectedState = null;
        } else {
            this.selectedState = null;
            this.selectedTransition = null;
        }

        this.onUpdate();
        this.render();
    }

    /**
     * Mouse move → drag state or update transition drawing line.
     */
    _onMouseMove(e) {
        const pos = this._getMousePos(e);
        this.mousePos = pos;

        if (this.dragging) {
            this.dragging.x = pos.x - this.dragOffset.x;
            this.dragging.y = pos.y - this.dragOffset.y;
            this.render();
        } else if (this.drawing) {
            this.render();
            // Draw a temporary line from source state to mouse
            this.ctx.beginPath();
            this.ctx.setLineDash([5, 5]);
            this.ctx.moveTo(this.drawing.x, this.drawing.y);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.strokeStyle = '#999';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    /**
     * Mouse up → finish drag or create transition.
     */
    _onMouseUp(e) {
        const pos = this._getMousePos(e);

        if (this.drawing) {
            const target = this._hitTestState(pos);
            if (target && target.id !== this.drawing.id) {
                // Ask for input condition
                const input = prompt(
                    `Transition ${this.drawing.label} → ${target.label}\nInput condition (e.g., "0" or "1"):`,
                    '0'
                );
                if (input !== null && input.trim() !== '') {
                    this.fsm.addTransition(this.drawing.id, target.id, input.trim());
                    this.onUpdate();
                }
            }
            this.drawing = null;
        }

        this.dragging = null;
        this.render();
    }

    /**
     * Right-click → context menu for state operations.
     */
    _onContextMenu(e) {
        e.preventDefault();
        const pos = this._getMousePos(e);
        const hitState = this._hitTestState(pos);

        if (!hitState) return;

        const action = prompt(
            `State "${hitState.label}":\n1 = Set as initial\n2 = Delete state\n3 = Set output`,
            '1'
        );

        if (action === '1') {
            this.fsm.setInitialState(hitState.id);
        } else if (action === '2') {
            this.fsm.removeState(hitState.id);
            if (this.selectedState === hitState) this.selectedState = null;
        } else if (action === '3') {
            const outputVal = prompt(
                `Set Moore output "${this.fsm.outputNames[0]}" for state "${hitState.label}":`,
                '0'
            );
            if (outputVal !== null) {
                const outputs = {};
                for (const name of this.fsm.outputNames) {
                    outputs[name] = parseInt(outputVal) || 0;
                }
                hitState.setOutputs(outputs);
            }
        }

        this.onUpdate();
        this.render();
    }

    // ── Hit testing ─────────────────────────────────────────────

    /**
     * Check if a point hits any state circle.
     */
    _hitTestState(pos) {
        for (const state of this.fsm.states) {
            const dx = pos.x - state.x;
            const dy = pos.y - state.y;
            if (dx * dx + dy * dy <= this.STATE_RADIUS * this.STATE_RADIUS) {
                return state;
            }
        }
        return null;
    }

    /**
     * Check if a point is near any transition arrow.
     * Returns the transition index or null.
     */
    _hitTestTransition(pos) {
        for (let i = 0; i < this.fsm.transitions.length; i++) {
            const t = this.fsm.transitions[i];
            const from = this.fsm.getState(t.from);
            const to = this.fsm.getState(t.to);
            if (!from || !to) continue;

            // Check distance from point to line segment
            const dist = this._pointToLineDist(pos, from, to);
            if (dist < 10) return i;
        }
        return null;
    }

    _pointToLineDist(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        return Math.hypot(p.x - projX, p.y - projY);
    }

    // ── Rendering ───────────────────────────────────────────────

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = this.COLORS.canvas;
        ctx.fillRect(0, 0, w, h);

        // Draw grid
        ctx.strokeStyle = this.COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let x = 0; x < w; x += 20) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 20) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Draw transitions first (behind states)
        this._drawTransitions(ctx);

        // Draw states
        this._drawStates(ctx);

        // Draw instructions
        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.fillText('Double-click: add state | Shift+drag: add transition | Right-click: state options', 10, h - 10);
    }

    _drawStates(ctx) {
        for (const state of this.fsm.states) {
            const isSelected = this.selectedState === state;
            const isInitial = state.isInitial;

            // State circle
            ctx.beginPath();
            ctx.arc(state.x, state.y, this.STATE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = isSelected
                ? this.COLORS.stateSelected
                : isInitial
                    ? this.COLORS.initial
                    : this.COLORS.state;
            ctx.fill();

            // Border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Double circle for initial state
            if (isInitial) {
                ctx.beginPath();
                ctx.arc(state.x, state.y, this.STATE_RADIUS - 5, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // State label
            ctx.fillStyle = this.COLORS.text;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(state.label, state.x, state.y);

            // Moore output label below state
            if (this.fsm.type === 'moore') {
                const outputStr = this.fsm.outputNames
                    .map(name => `${name}=${state.outputs[name] ?? '?'}`)
                    .join(',');
                ctx.fillStyle = '#333';
                ctx.font = '11px sans-serif';
                ctx.fillText(outputStr, state.x, state.y + this.STATE_RADIUS + 14);
            }
        }
    }

    _drawTransitions(ctx) {
        for (let i = 0; i < this.fsm.transitions.length; i++) {
            const t = this.fsm.transitions[i];
            const from = this.fsm.getState(t.from);
            const to = this.fsm.getState(t.to);
            if (!from || !to) continue;

            const isSelected = this.selectedTransition === i;

            // Calculate arrow direction
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy);
            if (dist === 0) continue;

            const ux = dx / dist;
            const uy = dy / dist;

            // Start and end points (at edge of circles)
            const startX = from.x + ux * this.STATE_RADIUS;
            const startY = from.y + uy * this.STATE_RADIUS;
            const endX = to.x - ux * this.STATE_RADIUS;
            const endY = to.y - uy * this.STATE_RADIUS;

            // Check if there's a reverse transition (need to curve)
            const hasReverse = this.fsm.transitions.some(
                other => other.from === t.to && other.to === t.from
            );

            ctx.strokeStyle = isSelected ? this.COLORS.transitionSelected : this.COLORS.transition;
            ctx.lineWidth = isSelected ? 2.5 : 1.5;

            if (hasReverse) {
                // Draw curved arrow
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const offset = 25;
                const cpX = midX - uy * offset;
                const cpY = midY + ux * offset;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
                ctx.stroke();

                // Arrowhead
                this._drawArrowhead(ctx, cpX, cpY, endX, endY);

                // Label at control point
                const labelX = cpX;
                const labelY = cpY - 8;
                this._drawTransitionLabel(ctx, t, labelX, labelY);
            } else {
                // Draw straight arrow
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Arrowhead
                this._drawArrowhead(ctx, startX, startY, endX, endY);

                // Label at midpoint
                const labelX = (startX + endX) / 2 - uy * 15;
                const labelY = (startY + endY) / 2 + ux * 15;
                this._drawTransitionLabel(ctx, t, labelX, labelY);
            }
        }
    }

    _drawArrowhead(ctx, fromX, fromY, toX, toY) {
        const headLen = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLen * Math.cos(angle - Math.PI / 6),
            toY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLen * Math.cos(angle + Math.PI / 6),
            toY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }

    _drawTransitionLabel(ctx, transition, x, y) {
        const label = transition.getLabel(this.fsm.inputNames, this.fsm.outputNames);
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background for readability
        const metrics = ctx.measureText(label);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x - metrics.width / 2 - 3, y - 8, metrics.width + 6, 16);

        ctx.fillStyle = '#333';
        ctx.fillText(label, x, y);
    }

    /**
     * Get info about current selection (for the properties panel).
     */
    getSelection() {
        if (this.selectedState) {
            return { type: 'state', item: this.selectedState };
        }
        if (this.selectedTransition !== null) {
            return { type: 'transition', item: this.fsm.transitions[this.selectedTransition], index: this.selectedTransition };
        }
        return null;
    }
}
