import assert from 'node:assert/strict';
import { buildMappings } from '../parsers.js';

const makeComponent = (id, name, packageName, count, startId) => ({
  id: String(id), name, packageName, contiguousGlobalIds: true, offset: startId - 1,
  lands: Array.from({ length: count }, (_, index) => ({
    componentId: String(id), globalId: startId + index, cadName: `${name}-${index + 1}`,
    left: index, top: 0, centerX: index + 0.25, centerY: 0.25, width: 0.5, length: 0.5,
  })),
});
const u1 = makeComponent(1, 'U1', 'BGA4', 4, 100);
const u2 = makeComponent(2, 'U2', 'BGA3', 3, 200);
const r9 = makeComponent(3, 'R9', 'RES', 2, 300);
const xmlData = { components: [u1, u2, r9] };
const rows = [
  ['Component', 'Package', 'Land', 'Measurement'],
  ['U1', 'BGA4', 1, 10], ['U1', 'BGA4', 2, 20], ['U1', 'BGA4', 3, 30], ['U1', 'BGA4', 4, 40],
  ['U2', 'BGA3', 1, 50], ['U2', 'BGA3', 2, 60], ['U2', 'BGA3', 3, 70],
];
const xlsxData = { activeSheet: { rows } };
const schema = { componentCol: 0, packageCol: 1, landCol: 2, measurementCol: 3 };
const result = buildMappings(xmlData, xlsxData, schema);
assert.deepEqual(result.componentSummaries.map((item) => item.componentName), ['U1', 'U2']);
assert.equal(result.componentSummaries.some((item) => item.componentName === 'R9'), false);
assert.equal(result.stats.rawParts, 2);
assert.equal(result.stats.mapped, 7);
assert.equal(result.mappings[0].measurement, 10);
assert.equal('resultCode' in result.mappings[0], false);
console.log('raw-data part filtering test passed');
