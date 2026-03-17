import { FSMGraph } from './FSMGraph.js';
import { FSMEditor } from './FSMEditor.js';
import { StateEncoder } from './StateEncoder.js';
import { TransitionTable } from './TransitionTable.js';
import { EquationDeriver } from './EquationDeriver.js';
import { BooleanMinimize, toSOPExpression } from './BooleanMinimize.js';

// ── Initialize ──────────────────────────────────────────────────

const canvas = document.getElementById('fsm-canvas');
canvas.width = canvas.parentElement.clientWidth;
canvas.height = 400;

const fsm = new FSMGraph();
const resultsDiv = document.getElementById('results');
const synthesizeBtn = document.getElementById('synthesize-btn');
const clearBtn = document.getElementById('clear-btn');
const loadExampleBtn = document.getElementById('load-example-btn');

// Create the editor
const editor = new FSMEditor(canvas, fsm, () => {
    updateSelectionPanel();
});

// ── Synthesis pipeline ──────────────────────────────────────────

synthesizeBtn.addEventListener('click', () => {
    runSynthesis();
});

clearBtn.addEventListener('click', () => {
    // Reset FSM
    fsm.states = [];
    fsm.transitions = [];
    fsm._nextId = 0;
    editor.selectedState = null;
    editor.selectedTransition = null;
    editor.render();
    resultsDiv.innerHTML = '<p class="placeholder">Draw an FSM and click Synthesize.</p>';
});

loadExampleBtn.addEventListener('click', () => {
    loadExample();
});

function runSynthesis() {
    resultsDiv.innerHTML = '';

    // Step 0: Validate
    const validation = fsm.validate();
    if (!validation.valid) {
        resultsDiv.innerHTML = renderSection('Validation Failed', `
            <ul class="error-list">
                ${validation.errors.map(e => `<li>❌ ${e}</li>`).join('')}
            </ul>
        `);
        return;
    }

    let html = '';

    // Show warnings if any
    if (validation.warnings.length > 0) {
        html += renderSection('Warnings', `
            <ul class="warning-list">
                ${validation.warnings.map(w => `<li>⚠️ ${w}</li>`).join('')}
            </ul>
        `);
    }

    // Step 1: Show FSM definition
    html += renderSection('Stage 1: FSM Definition', `
        <p>Type: <strong>${fsm.type.toUpperCase()}</strong> |
           States: <strong>${fsm.states.length}</strong> |
           Transitions: <strong>${fsm.transitions.length}</strong> |
           Inputs: <strong>${fsm.inputNames.join(', ')}</strong> |
           Outputs: <strong>${fsm.outputNames.join(', ')}</strong></p>
        <pre>${JSON.stringify(fsm.toJSON(), null, 2)}</pre>
    `);

    // Step 2: State Encoding
    const encoder = new StateEncoder(fsm);
    encoder.encode();
    const encSummary = encoder.getSummary();

    html += renderSection('Stage 2: State Encoding', `
        <p>Flip-flops needed: <strong>${encSummary.numBits}</strong> (ceil(log₂(${encSummary.numStates})))</p>
        <table>
            <tr><th>State</th><th>Binary Code</th></tr>
            ${Object.entries(encSummary.encoding).map(([id, code]) => {
                const state = fsm.getState(id);
                return `<tr><td>${state ? state.label : id}</td><td>${code}</td></tr>`;
            }).join('')}
        </table>
        ${encSummary.unusedCodes.length > 0
            ? `<p>Unused codes (don't-care): ${encSummary.unusedCodes.join(', ')}</p>`
            : ''}
    `);

    // Step 3: Transition Table
    const table = new TransitionTable(fsm, encoder);
    table.build();
    const tableSummary = table.getSummary();

    const stateHeaders = tableSummary.columns.currentState.map(q => `<th>${q}</th>`).join('');
    const inputHeaders = tableSummary.columns.inputs.map(i => `<th>${i}</th>`).join('');
    const nextHeaders = tableSummary.columns.nextState.map(q => `<th>${q}</th>`).join('');
    const outputHeaders = tableSummary.columns.outputs.map(o => `<th>${o}</th>`).join('');

    const tableRows = tableSummary.rows.map(row => {
        const cssCls = row.isDontCare ? 'class="dont-care"' : '';
        const csBits = row.currentState.split('').map(b => `<td>${b}</td>`).join('');
        const inBits = row.input.split('').map(b => `<td>${b}</td>`).join('');
        const nsBits = row.nextState.split('').map(b => `<td>${b}</td>`).join('');
        const outBits = row.output.split('').map(b => `<td>${b}</td>`).join('');
        return `<tr ${cssCls}>${csBits}${inBits}${nsBits}${outBits}</tr>`;
    }).join('');

    html += renderSection('Stage 3: Transition Table', `
        <p>Rows: ${tableSummary.totalRows} (${tableSummary.dontCareRows} don't-care)</p>
        <table>
            <tr>${stateHeaders}${inputHeaders}${nextHeaders}${outputHeaders}</tr>
            ${tableRows}
        </table>
    `);

    // Step 4: Equation Derivation
    const deriver = new EquationDeriver(table, fsm);
    deriver.derive();
    const eqSummary = deriver.getSummary();

    html += renderSection('Stage 4: Equation Derivation', `
        <table>
            <tr><th>Function</th><th>Minterms</th><th>Don't Cares</th></tr>
            ${eqSummary.map(fn => `
                <tr>
                    <td><strong>${fn.name}</strong></td>
                    <td>${fn.mintermStr}</td>
                    <td>${fn.dontCareStr || '—'}</td>
                </tr>
            `).join('')}
        </table>
        <p>Variables: ${fn_varNames(encoder, fsm).join(', ')} (${eqSummary[0]?.numVars} total)</p>
    `);

    // Step 5: Boolean Minimization
    const varNames = fn_varNames(encoder, fsm);
    const minimized = deriver.functions.map(fn => {
        const bm = new BooleanMinimize(fn.numVars, fn.minterms, fn.dontCares);
        return {
            name: fn.name,
            implicants: bm.result,
            expression: toSOPExpression(bm.result, varNames),
        };
    });

    html += renderSection('Stage 5: Minimized Boolean Equations', `
        <div class="equations">
            ${minimized.map(m => `
                <div class="equation">
                    <strong>${m.name}</strong> = ${m.expression}
                </div>
            `).join('')}
        </div>
    `);

    resultsDiv.innerHTML = html;
}

function fn_varNames(encoder, fsm) {
    const names = [];
    for (let i = 0; i < encoder.numBits; i++) {
        names.push(`Q${i}`);
    }
    for (const inputName of fsm.inputNames) {
        names.push(inputName);
    }
    return names;
}

function renderSection(title, content) {
    return `
        <div class="result-section">
            <h3>${title}</h3>
            <div class="section-content">${content}</div>
        </div>
    `;
}

function updateSelectionPanel() {
    const panel = document.getElementById('selection-panel');
    const sel = editor.getSelection();

    if (!sel) {
        panel.innerHTML = '<p class="placeholder">Click a state or transition to see its properties.</p>';
        return;
    }

    if (sel.type === 'state') {
        const s = sel.item;
        panel.innerHTML = `
            <h4>State: ${s.label}</h4>
            <p>ID: ${s.id} | Initial: ${s.isInitial ? 'Yes' : 'No'}</p>
            <p>Position: (${Math.round(s.x)}, ${Math.round(s.y)})</p>
            <p>Outputs: ${JSON.stringify(s.outputs)}</p>
        `;
    } else if (sel.type === 'transition') {
        const t = sel.item;
        panel.innerHTML = `
            <h4>Transition: ${t.from} → ${t.to}</h4>
            <p>Input: ${t.input}</p>
            <p>Outputs: ${JSON.stringify(t.outputs)}</p>
        `;
    }
}

function loadExample() {
    // Clear current
    fsm.states = [];
    fsm.transitions = [];
    fsm._nextId = 0;

    // 3-state Moore machine: detects sequence "01"
    // S0 (initial, Z=0): idle
    // S1 (Z=0): seen "0"
    // S2 (Z=1): seen "01" → output 1
    const s0 = fsm.addState(120, 200);
    s0.setOutputs({ Z: 0 });

    const s1 = fsm.addState(320, 200);
    s1.setOutputs({ Z: 0 });

    const s2 = fsm.addState(520, 200);
    s2.setOutputs({ Z: 1 });

    fsm.setInitialState(s0.id);

    // Transitions
    fsm.addTransition(s0.id, s1.id, '0');  // S0 --0--> S1
    fsm.addTransition(s0.id, s0.id, '1');  // S0 --1--> S0 (self-loop — not drawn yet)
    fsm.addTransition(s1.id, s1.id, '0');  // S1 --0--> S1
    fsm.addTransition(s1.id, s2.id, '1');  // S1 --1--> S2
    fsm.addTransition(s2.id, s1.id, '0');  // S2 --0--> S1
    fsm.addTransition(s2.id, s0.id, '1');  // S2 --1--> S0

    editor.selectedState = null;
    editor.selectedTransition = null;
    editor.render();

    resultsDiv.innerHTML = '<p class="placeholder">Example loaded! Click <strong>Synthesize</strong> to run the pipeline.</p>';
}

// ── Handle window resize ────────────────────────────────────────

window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    editor.render();
});
