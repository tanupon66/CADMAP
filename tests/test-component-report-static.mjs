import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [html, app, sw, report, renderer] = await Promise.all([
  fs.readFile(new URL('../index.html', import.meta.url), 'utf8'),
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../xlsx-report.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../component-report.js', import.meta.url), 'utf8'),
]);
for (const id of ['exportExcelButton','componentReportOverlay','componentReportScope','componentReportZones','componentReportLabels','componentReportNameSource','generateComponentReportButton']) assert(html.includes(`id="${id}"`), `missing ${id}`);
for (const fn of ['openComponentReport','generateComponentReport','componentReportRows','updateComponentReportPreview']) assert(app.includes(`function ${fn}`), `missing ${fn}`);
assert(app.includes("from './xlsx-report.js'"));
assert(app.includes("from './component-report.js'"));
assert(sw.includes('./xlsx-report.js') && sw.includes('./component-report.js'));
assert(report.includes('buildComponentReportXlsx'));
assert(renderer.includes('renderOverviewImage') && renderer.includes('renderZoneImage'));
console.log('component Excel report static checks passed');
