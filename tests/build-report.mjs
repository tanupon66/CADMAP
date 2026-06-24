import fs from 'node:fs/promises';
import { ZipArchive } from '../zip-reader.js';
import { parseInspectionXml, parseXlsx, autoDetectSchema, buildMappings } from '../parsers.js';

const source = '/mnt/data/r4172-b0001-01_r01-smb-0430-doe_odb-A.zip';
const outer = new ZipArchive(await fs.readFile(source));
const xmlEntry = outer.find((e) => /\.xml$/i.test(e.name));
const xlsxEntry = outer.find((e) => /\.xlsx$/i.test(e.name));
const xml = parseInspectionXml(await outer.read(xmlEntry.name, 'text'));
const xlsx = await parseXlsx(await outer.read(xlsxEntry.name, 'arraybuffer'));
const schema = autoDetectSchema(xlsx.activeSheet.rows, xml);
const mapping = buildMappings(xml, xlsx, schema);
const u1 = xml.components.find((c) => c.name === 'U1' && c.packageName === 'BGA17662_4724_P0354');
const rows = mapping.mappings.filter((m) => m.componentName === 'U1');
const codeCounts = Object.fromEntries([...rows.reduce((map, row) => map.set(String(row.resultCode), (map.get(String(row.resultCode)) || 0) + 1), new Map())]);
const measurements = rows.map((r) => Number(r.measurement)).filter(Number.isFinite);
const nameCounts = new Map();
for (const land of u1.lands) nameCounts.set(land.cadName, (nameCounts.get(land.cadName) || 0) + 1);
const duplicateNames = [...nameCounts.values()].filter((count) => count > 1);
const example = rows.find((m) => m.localIndex === 17660);
const report = {
  board: xml.board,
  xml: { componentCount: xml.components.length, landCount: xml.totalLands },
  xray: { sheet: xlsx.activeSheet.name, dataRows: rows.length, columns: xlsx.activeSheet.rows[0].length },
  detectedColumns: {
    component: `${String.fromCharCode(65 + schema.componentCol)} (${schema.componentCol + 1})`,
    package: `${String.fromCharCode(65 + schema.packageCol)} (${schema.packageCol + 1})`,
    land: `${String.fromCharCode(65 + schema.landCol)} (${schema.landCol + 1})`,
    measurement: `${String.fromCharCode(65 + schema.measurementCol)} (${schema.measurementCol + 1})`,
    result: `${String.fromCharCode(65 + schema.resultCol)} (${schema.resultCol + 1})`,
  },
  component: {
    id: u1.id, name: u1.name, packageName: u1.packageName,
    centerX: u1.centerX, centerY: u1.centerY, angle: u1.angle,
    landCount: u1.lands.length,
    minGlobalId: u1.lands[0].globalId,
    maxGlobalId: u1.lands.at(-1).globalId,
    contiguous: u1.contiguousGlobalIds,
    offset: u1.offset,
    bounds: u1.bounds,
  },
  mapping: mapping.stats,
  resultCodeCounts: codeCounts,
  measurement: { min: Math.min(...measurements), max: Math.max(...measurements), average: measurements.reduce((a,b)=>a+b,0)/measurements.length },
  cadNames: { unique: nameCounts.size, duplicateNameCount: duplicateNames.length, duplicatedLandRows: duplicateNames.reduce((a,b)=>a+b,0) },
  example17660: example,
};
await fs.writeFile('/mnt/data/r4172_mapping_analysis.json', JSON.stringify(report, null, 2));
const headers = ['xray_local_land','xml_global_land_id','cad_name','component','package','left_mm','top_mm','center_x_mm','center_y_mm','width_mm','length_mm','measurement_pixel','result_code','confidence','duplicate_cad_name_count','source_row'];
const esc = (v) => { const s=v==null?'':String(v); return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
const lines = [headers.join(',')];
for (const m of rows) lines.push([m.localIndex,m.globalId,m.cadName,m.componentName,m.packageName,m.left,m.top,m.centerX,m.centerY,m.width,m.length,m.measurement,m.resultCode,m.confidence,m.duplicateCadNameCount,m.sourceRow].map(esc).join(','));
await fs.writeFile('/mnt/data/r4172_U1_land_mapping.csv', '\ufeff'+lines.join('\r\n'));
console.log(JSON.stringify({ report:'/mnt/data/r4172_mapping_analysis.json', csv:'/mnt/data/r4172_U1_land_mapping.csv', example:report.example17660, stats:report.mapping }, null, 2));
