import assert from 'node:assert/strict';
import { autoDetectSchema, buildMappings } from '../parsers.js';

const makeLand = (componentId, globalId, cadName, localIndex) => ({
  componentId: String(componentId), globalId, cadName, localIndex,
  left: localIndex, top: 1, centerX: localIndex + 0.25, centerY: 0.75, width: 0.5, length: 0.5,
});
const originalComponent = {
  id: '1', name: 'U1', packageName: 'BGA3', contiguousGlobalIds: true,
  lands: [makeLand(1, 101, 'A1', 1), makeLand(1, 102, 'A1', 2), makeLand(1, 103, 'B1', 3)],
};
const generatedComponent = {
  id: '1', name: 'U1', packageName: 'BGA3', contiguousGlobalIds: true,
  lands: [makeLand(1, 101, 'L0A0A', 1), makeLand(1, 102, 'L0A0B', 2), makeLand(1, 103, 'L0A0C', 3)],
};
const original = { components: [originalComponent] };
const generated = { components: [generatedComponent] };
const rows = [
  ['Component', 'Package', 'Identifier', 'Measurement'],
  ['U1', 'BGA3', 'L0A0A', 500],
  ['U1', 'BGA3', 'L0A0B', 510],
  ['U1', 'BGA3', 'L0A0C', 520],
];
const xlsx = { activeSheet: { rows } };

const schemaForOriginal = autoDetectSchema(rows, original, { alternateCadData: generated });
assert.equal(schemaForOriginal.landCol, 2);
assert.equal(schemaForOriginal.landMode, 'cad-name');
const bridged = buildMappings(original, xlsx, schemaForOriginal, { alternateCadData: generated });
assert.equal(bridged.stats.mapped, 3);
assert.equal(bridged.stats.verified, 3);
assert.equal(bridged.stats.exactOtherCadName, 3);
assert.deepEqual(bridged.mappings.map((m) => m.globalId), [101, 102, 103]);
assert.deepEqual(bridged.mappings.map((m) => m.localIndex), ['L0A0A', 'L0A0B', 'L0A0C']);

const schemaForGenerated = autoDetectSchema(rows, generated, { alternateCadData: original });
assert.equal(schemaForGenerated.landMode, 'cad-name');
const direct = buildMappings(generated, xlsx, schemaForGenerated, { alternateCadData: original });
assert.equal(direct.stats.exactCadName, 3);
assert.equal(direct.stats.unmapped, 0);

const sequentialRows = [
  ['Component', 'Package', 'Identifier'],
  ['U1', 'BGA3', 1], ['U1', 'BGA3', 2], ['U1', 'BGA3', 3],
];
const localSchema = autoDetectSchema(sequentialRows, original);
assert.equal(localSchema.landMode, 'local-index');
const local = buildMappings(original, { activeSheet: { rows: sequentialRows } }, localSchema);
assert.deepEqual(local.mappings.map((m) => m.globalId), [101, 102, 103]);
assert.equal(local.stats.localOrderGuess, 3);

console.log('text identifiers and two-source bridge tests passed');
