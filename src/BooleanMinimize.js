/**
 * BooleanMinimize — Quine-McCluskey algorithm for Boolean minimization.
 *
 * Takes minterms + don't-cares and produces minimized SOP expressions.
 *
 * This is a standalone implementation matching the API used in CircuitVerse:
 *   const result = new BooleanMinimize(numVars, minterms, dontCares);
 *   result.result  // → array of SOP term strings like ["01-1", "1-10"]
 *
 * Each result string has one character per variable:
 *   '0' = variable complemented (NOT)
 *   '1' = variable true
 *   '-' = variable doesn't matter (eliminated)
 */
export class BooleanMinimize {
    /**
     * @param {number}   numVars   - Number of input variables
     * @param {number[]} minterms  - Array of minterm indices
     * @param {number[]} dontCares - Array of don't-care indices
     */
    constructor(numVars, minterms, dontCares = []) {
        this.numVars = numVars;
        this.minterms = minterms;
        this.dontCares = dontCares;
        this._result = null;
    }

    /**
     * Lazy-computed result — only runs the algorithm when first accessed.
     */
    get result() {
        if (this._result === null) {
            this._result = this._solve();
        }
        return this._result;
    }

    /**
     * Run the Quine-McCluskey algorithm.
     * Returns array of implicant strings.
     */
    _solve() {
        // All terms to work with (minterms + don't-cares)
        const allTerms = [...this.minterms, ...this.dontCares];

        if (allTerms.length === 0) return [];

        // Check if all possible minterms are covered → result is just "1"
        const totalPossible = Math.pow(2, this.numVars);
        if (this.minterms.length === totalPossible) {
            return ['-'.repeat(this.numVars)];
        }

        // Step 1: Find all prime implicants
        const primeImplicants = this._findPrimeImplicants(allTerms);

        // Step 2: Use a covering algorithm to select minimum set
        // that covers all original minterms (not don't-cares)
        const selected = this._selectEssentialImplicants(primeImplicants);

        return selected;
    }

    /**
     * Step 1: Find prime implicants by repeatedly combining terms
     * that differ in exactly one bit.
     */
    _findPrimeImplicants(terms) {
        // Convert each term to its binary representation
        let currentGroup = terms.map(t => ({
            binary: t.toString(2).padStart(this.numVars, '0'),
            covered: new Set([t]),
            used: false,
        }));

        const primeImplicants = [];

        // Keep combining until no more combinations possible
        while (currentGroup.length > 0) {
            const nextGroup = [];
            const combined = new Set();

            for (let i = 0; i < currentGroup.length; i++) {
                for (let j = i + 1; j < currentGroup.length; j++) {
                    const a = currentGroup[i];
                    const b = currentGroup[j];

                    const diffPos = this._differByOneBit(a.binary, b.binary);
                    if (diffPos !== -1) {
                        // Combine: replace differing bit with '-'
                        const newBinary =
                            a.binary.substring(0, diffPos) +
                            '-' +
                            a.binary.substring(diffPos + 1);

                        // Check if we already have this combination
                        const key = newBinary;
                        if (!combined.has(key)) {
                            combined.add(key);
                            nextGroup.push({
                                binary: newBinary,
                                covered: new Set([...a.covered, ...b.covered]),
                                used: false,
                            });
                        }

                        a.used = true;
                        b.used = true;
                    }
                }
            }

            // Terms that couldn't be combined are prime implicants
            for (const term of currentGroup) {
                if (!term.used) {
                    primeImplicants.push(term);
                }
            }

            currentGroup = nextGroup;
        }

        return primeImplicants;
    }

    /**
     * Check if two binary strings differ in exactly one non-dash position.
     * Returns the position index, or -1 if not exactly one difference.
     */
    _differByOneBit(a, b) {
        let diffCount = 0;
        let diffPos = -1;

        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                diffCount++;
                diffPos = i;
                if (diffCount > 1) return -1;
            }
        }

        return diffCount === 1 ? diffPos : -1;
    }

    /**
     * Step 2: Select essential prime implicants using a greedy covering approach.
     * Covers all original minterms (not don't-cares).
     */
    _selectEssentialImplicants(primeImplicants) {
        const selected = [];
        const uncovered = new Set(this.minterms);

        // Find essential prime implicants first:
        // A PI is essential if it's the ONLY one covering some minterm
        for (const minterm of this.minterms) {
            const covering = primeImplicants.filter(pi => pi.covered.has(minterm));
            if (covering.length === 1) {
                const essential = covering[0];
                if (!selected.includes(essential.binary)) {
                    selected.push(essential.binary);
                    // Mark all minterms covered by this PI
                    for (const m of essential.covered) {
                        uncovered.delete(m);
                    }
                }
            }
        }

        // Greedy: cover remaining minterms with largest-coverage PIs
        while (uncovered.size > 0) {
            let bestPI = null;
            let bestCount = 0;

            for (const pi of primeImplicants) {
                if (selected.includes(pi.binary)) continue;

                let count = 0;
                for (const m of uncovered) {
                    if (pi.covered.has(m)) count++;
                }

                if (count > bestCount) {
                    bestCount = count;
                    bestPI = pi;
                }
            }

            if (!bestPI) break; // Safety: shouldn't happen

            selected.push(bestPI.binary);
            for (const m of bestPI.covered) {
                uncovered.delete(m);
            }
        }

        return selected;
    }
}

/**
 * Convert a Quine-McCluskey result string to a human-readable SOP term.
 *
 * @param {string}   implicant  - e.g., "01-1"
 * @param {string[]} varNames   - e.g., ["Q1", "Q0", "X"]
 * @returns {string} - e.g., "Q1'·Q0·X"
 */
export function implicantToExpression(implicant, varNames) {
    const parts = [];

    for (let i = 0; i < implicant.length; i++) {
        const ch = implicant[i];
        const name = varNames[i] || `x${i}`;

        if (ch === '1') {
            parts.push(name);
        } else if (ch === '0') {
            parts.push(`${name}'`);
        }
        // '-' means variable is eliminated, skip it
    }

    // If all variables eliminated, the term is just "1"
    return parts.length > 0 ? parts.join('·') : '1';
}

/**
 * Convert an array of implicant strings to a full SOP expression.
 *
 * @param {string[]} implicants - e.g., ["01-1", "1-10"]
 * @param {string[]} varNames   - e.g., ["Q1", "Q0", "X"]
 * @returns {string} - e.g., "Q1'·Q0·X + Q1·Q0'"
 */
export function toSOPExpression(implicants, varNames) {
    if (implicants.length === 0) return '0';

    const terms = implicants.map(imp => implicantToExpression(imp, varNames));
    return terms.join(' + ');
}
