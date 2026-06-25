import assert from 'node:assert/strict';
import { buildCadComparison, cadComparisonToCsv } from '../cad-compare.js';

const original = { components: [{ id: '1', name: 'U1', packageName: 'BGA3', centerX: 0, centerY: 0, lands: [
  { componentId: '1', globalId: 10, localIndex: 1, cadName: 'L999', originalCadName: 'A1', centerX: 0, centerY: 0, width: .5, length: .5 },
  { componentId: '1', globalId: 11, localIndex: 2, cadName: 'A2', centerX: 1, centerY: 0, width: .5, length: .5 },
  { componentId: '1', globalId: 12, localIndex: 3, cadName: 'A3', centerX: 2, centerY: 0, width: .5, length: .5 },
] }] };
const generated = { components: [{ id: '1', name: 'U1', packageName: 'BGA3', centerX: 0, centerY: 0, lands: [
  { componentId: '1', globalId: 10, localIndex: 1, cadName: 'L001', centerX: 0, centerY: 0, width: .5, length: .5 },
  { componentId: '1', globalId: 11, localIndex: 2, cadName: 'A2', centerX: 1.01, centerY: 0, width: .5, length: .5 },
  { componentId: '1', globalId: 13, localIndex: 3, cadName: 'L003', centerX: 2, centerY: 0, width: .5, length: .5 },
] }] };
const result = buildCadComparison(original, generated, { coordinateTolerance: .05, moveTolerance: .001 });
assert.equal(result.summary.matchedComponents, 1);
assert.equal(result.summary.renamed, 2); // A1->L001 and A3->L003 via coordinate
assert.equal(result.summary.moved, 1);
assert.equal(result.summary.missingGenerated, 0);
assert.equal(result.summary.extraGenerated, 0);
assert(result.rows.some((row) => row.originalGlobalId === 12 && row.generatedGlobalId === 13 && row.landMethod === 'coordinate'));
assert(cadComparisonToCsv(result).includes('original_name'));
console.log('CAD compare tests passed');
