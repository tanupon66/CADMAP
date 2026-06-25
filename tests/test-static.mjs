import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const [html, app, parser] = await Promise.all([
  fs.readFile(new URL('../index.html', import.meta.url), 'utf8'),
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../parsers.js', import.meta.url), 'utf8'),
]);
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const refs = new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]));
assert.deepEqual([...refs].filter((id) => !ids.has(id)), []);
assert(html.includes('measurementHistogram'));
assert(html.includes('detailedHistogramCanvas'));
assert(html.includes('histogramRangeMin'));
assert(html.includes('histogramRangeMax'));
assert(html.includes('histogramCadFilter'));
assert(app.includes('renderDetailedHistogram'));
assert(app.includes('exportHistogramCsv'));
assert(app.includes('Std. deviation') || html.includes('Std. deviation'));
assert(html.includes('Raw-data parts'));
assert(html.includes('duplicateToggle'));
assert(html.includes('duplicateOnlyToggle'));
assert(html.includes('duplicateNameSelect'));
assert(html.includes('duplicatePositionList'));
assert(app.includes('duplicateGroupsForComponent'));
assert(app.includes('fitDuplicateGroup'));
assert(app.includes('เส้นประบนกราฟิก'));

assert(html.includes('cadInspectorOverlay'));
assert(html.includes('cadExportXmlButton'));
assert(html.includes('cadMaxLength'));
assert(app.includes('buildCadNameAudit'));
assert(app.includes('rewriteCadXml'));
assert(app.includes('exportCorrectedCadXml'));
assert.equal(/Result code|result_code/i.test(html + app + parser), false);
console.log('static DOM and removed-result checks passed');
