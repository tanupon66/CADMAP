import assert from 'node:assert/strict';
import { createSequencePreview, stateForLand } from '../manual-pattern.js';

const component = { id: '1', lands: Array.from({ length: 10 }, (_, i) => ({ componentId: '1', globalId: 100 + i, cadName: `L${i + 1}`, left: i, top: 0, centerX: i, centerY: 0, width: 1, length: 1 })) };
const makeMappings = () => Array.from({ length: 10 }, (_, i) => ({ localIndex: i + 1, componentId: '1', globalId: 100 + i, mapped: true, cadName: `L${i + 1}`, manual: false, verified: false, confidence: 20, anchorLocked: false }));

const forwardMappings = makeMappings();
Object.assign(forwardMappings[2], stateForLand(forwardMappings[2], component.lands[4], { anchorLocked: true, verified: true })); // local 3 -> CAD index 5
Object.assign(forwardMappings[7], stateForLand(forwardMappings[7], component.lands[9], { anchorLocked: true, verified: true })); // local 8 -> CAD index 10
const forward = createSequencePreview({ mappings: forwardMappings, component, direction: 'auto' });
assert.equal(forward.ok, true);
assert.equal(forward.direction, 'forward');
assert.equal(forward.counts.segments, 1);
assert.equal(forward.proposals[0].localIndex, 3); // must not extrapolate before first anchor
assert.equal(forward.proposals.at(-1).localIndex, 8); // must not extrapolate after last anchor
assert.equal(forward.proposals.find((p) => p.localIndex === 4).land.globalId, 105);

const reverseMappings = makeMappings();
Object.assign(reverseMappings[0], stateForLand(reverseMappings[0], component.lands[9], { anchorLocked: true, verified: true }));
Object.assign(reverseMappings[9], stateForLand(reverseMappings[9], component.lands[0], { anchorLocked: true, verified: true }));
const reverse = createSequencePreview({ mappings: reverseMappings, component, direction: 'auto' });
assert.equal(reverse.ok, true);
assert.equal(reverse.direction, 'reverse');
assert.equal(reverse.proposals[0].land.globalId, 109);
assert.equal(reverse.proposals.at(-1).land.globalId, 100);

const oneAnchor = makeMappings();
Object.assign(oneAnchor[0], stateForLand(oneAnchor[0], component.lands[0], { anchorLocked: true, verified: true }));
assert.equal(createSequencePreview({ mappings: oneAnchor, component }).ok, false);

const inconsistent = makeMappings();
Object.assign(inconsistent[0], stateForLand(inconsistent[0], component.lands[0], { anchorLocked: true, verified: true }));
Object.assign(inconsistent[4], stateForLand(inconsistent[4], component.lands[8], { anchorLocked: true, verified: true }));
assert.equal(createSequencePreview({ mappings: inconsistent, component }).ok, false);

console.log('safe manual pattern tests passed');
