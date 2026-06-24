import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ZipArchive } from '../zip-reader.js';
import { parseInspectionXml, parseXlsx, autoDetectSchema, buildMappings } from '../parsers.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node tests/test-parsers.mjs /path/to/project.zip');
const bytes = await fs.readFile(source);
const outer = new ZipArchive(bytes);
const xmlEntry = outer.find((e) => /\.xml$/i.test(e.name));
const xlsxEntry = outer.find((e) => /\.xlsx$/i.test(e.name));
assert(xmlEntry && xlsxEntry, 'ZIP must contain XML and XLSX');
const xml = parseInspectionXml(await outer.read(xmlEntry.name, 'text'));
const xlsx = await parseXlsx(await outer.read(xlsxEntry.name, 'arraybuffer'));
const schema = autoDetectSchema(xlsx.activeSheet.rows, xml);
const mapping = buildMappings(xml, xlsx, schema);
assert(mapping.stats.total > 0);
assert(mapping.stats.mapped > 0);
console.log(JSON.stringify({
  board: xml.board.Name,
  xmlLands: xml.totalLands,
  components: xml.components.length,
  xrayRows: xlsx.activeSheet.rows.length - 1,
  detectedColumns: {
    component: schema.componentCol,
    package: schema.packageCol,
    land: schema.landCol,
    measurement: schema.measurementCol,
  },
  mapping: mapping.stats,
}, null, 2));
