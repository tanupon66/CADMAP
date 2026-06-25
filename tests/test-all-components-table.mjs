import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [html, app] = await Promise.all([fs.readFile(new URL('../index.html', import.meta.url), 'utf8'), fs.readFile(new URL('../app.js', import.meta.url), 'utf8')]);
for (const label of ['CAD local','Width','Length','Method']) assert(html.includes(`<th>${label}</th>`), `missing CAD column ${label}`);
assert(html.includes('value="cad-only"'), 'CAD-only filter missing');
for (const fn of ['cadOnlyTableRow','currentTableRows','cadLocalIndexFor']) assert(app.includes(`function ${fn}`), `missing ${fn}`);
assert(app.includes('CAD only ·'), 'all-component selector label missing');
console.log('all-components and CAD table static checks passed');
