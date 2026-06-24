import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ZipArchive } from '../zip-reader.js';
import { parseInspectionXml } from '../parsers.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node tests/test-duplicates.mjs /path/to/project.zip');
const outer = new ZipArchive(await fs.readFile(source));
const xmlEntry = outer.find((entry) => /\.xml$/i.test(entry.name));
assert(xmlEntry, 'ZIP must contain XML');
const xml = parseInspectionXml(await outer.read(xmlEntry.name, 'text'));
const component = xml.components.find((item) => item.name === 'U1');
assert(component, 'Expected U1 in example CAD');
const groups = new Map();
for (const land of component.lands) {
  const name = String(land.cadName || '').trim();
  if (!name) continue;
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name).push(land);
}
const duplicates = new Map([...groups].filter(([, lands]) => lands.length > 1));
const duplicatePositions = [...duplicates.values()].reduce((sum, lands) => sum + lands.length, 0);
assert.equal(duplicates.size, 1169);
assert.equal(duplicatePositions, 2338);
for (const lands of duplicates.values()) {
  assert(lands.length > 1);
  assert(lands.every((land) => Number.isFinite(land.centerX) && Number.isFinite(land.centerY)));
}
console.log(JSON.stringify({ component: component.name, duplicateGroups: duplicates.size, duplicatePositions }, null, 2));
