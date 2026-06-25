import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ZipArchive } from '../zip-reader.js';
import { parseInspectionXml } from '../parsers.js';
import { buildCadNameAudit, generateCadRenames, rewriteCadXml } from '../cad-inspector.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node tests/test-cad-inspector.mjs /path/to/project.zip');
const outer = new ZipArchive(await fs.readFile(source));
const xmlEntry = outer.find((entry) => /\.xml$/i.test(entry.name));
assert(xmlEntry, 'ZIP must contain XML');
const xmlText = await outer.read(xmlEntry.name, 'text');
const xml = parseInspectionXml(xmlText);
const initial = buildCadNameAudit(xml, new Map(), { maxLength: 5 });
assert(initial.summary.unresolved > 0, 'Expected duplicate or overlength names in sample CAD');
const generated = generateCadRenames(xml, new Map(), { maxLength: 5, prefix: 'L', renameAll: false });
assert(generated.renames.size > 0);
const fixed = buildCadNameAudit(xml, generated.renames, { maxLength: 5 });
assert.equal(fixed.summary.unresolved, 0);
const rewritten = rewriteCadXml(xmlText, generated.renames);
assert.notEqual(rewritten, xmlText);
const reparsed = parseInspectionXml(rewritten);
const finalAudit = buildCadNameAudit(reparsed, new Map(), { maxLength: 5 });
assert.equal(finalAudit.summary.unresolved, 0);

const synthetic = {
  components: [{ id: '1', name: 'U1', packageName: 'BGA', lands: [
    { componentId: '1', globalId: 1, localIndex: 1, cadName: 'LONGNAME' },
    { componentId: '1', globalId: 2, localIndex: 2, cadName: 'A1' },
    { componentId: '1', globalId: 3, localIndex: 3, cadName: 'A1' },
    { componentId: '1', globalId: 4, localIndex: 4, cadName: '' },
  ] }],
};
const syntheticInitial = buildCadNameAudit(synthetic, new Map(), { maxLength: 5 });
assert.equal(syntheticInitial.summary.tooLong, 1);
assert.equal(syntheticInitial.summary.blank, 1);
assert.equal(syntheticInitial.summary.duplicateLands, 2);
const syntheticFix = generateCadRenames(synthetic, new Map(), { maxLength: 5, prefix: 'L' });
assert.equal(buildCadNameAudit(synthetic, syntheticFix.renames, { maxLength: 5 }).summary.unresolved, 0);

console.log(JSON.stringify({
  initial: initial.summary,
  generated: generated.generated,
  final: finalAudit.summary,
}, null, 2));
