import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [html, app, sw] = await Promise.all([
  fs.readFile(new URL('../index.html', import.meta.url), 'utf8'),
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);
for (const id of ['originalCadFile','generatedCadFile','generatedXmlFileName','activeCadSelect','cadCompareButton','cadCompareOverlay','cadCompareTableBody','cadCompareOverlayToggle']) assert(html.includes(`id="${id}"`), `missing ${id}`);
for (const fn of ['storeCadFile','activateCad','rebuildCadComparison','renderCadCompare','drawCadComparisonOverlay']) assert(app.includes(`function ${fn}`), `missing ${fn}`);
assert(app.includes(".filter((component) => component.lands?.length)"), 'all-CAD component list missing');
assert(sw.includes('./cad-compare.js'), 'cad-compare.js not cached');
console.log('dual CAD static checks passed');
