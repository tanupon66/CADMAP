import assert from 'node:assert/strict';
import { buildComponentReportXlsx } from '../xlsx-report.js';
import { ZipArchive } from '../zip-reader.js';
import { parseXlsx } from '../parsers.js';

const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+g3sJ9QAAAABJRU5ErkJggg==', 'base64'));
const rows = [
  { componentName:'U1', packageName:'BGA4', zone:'A1', localIndex:1, xrayLand:1, globalId:10, cadName:'A1', originalCadName:'A1', generatedCadName:'L001', centerX:1, centerY:1, width:.4, length:.4, measurement:500, confirmed:true, mappingStatus:'Confirmed', duplicateCount:1 },
  { componentName:'U1', packageName:'BGA4', zone:'A2', localIndex:2, xrayLand:2, globalId:11, cadName:'A2', originalCadName:'A2', generatedCadName:'L002', centerX:2, centerY:1, width:.4, length:.4, measurement:520, confirmed:false, mappingStatus:'Unverified', duplicateCount:1 },
];
const zones = ['A1','A2','B1','B2'].map((label, index) => ({ label, bounds:{minX:index%2,maxX:index%2+1,minY:index<2?1:0,maxY:index<2?2:1}, rows:rows.filter(r=>r.zone===label), imagePng:png }));
const report = { compatibilityMode:true, title:'Test Component Report', boardName:'TEST', cadFileName:'test.xml', xlsxFileName:'raw.xlsx', generatedAt:new Date().toISOString(), zoneGrid:2, nameSourceLabel:'Generated CAD', components:[{id:'1',name:'U1',packageName:'BGA4',bounds:{minX:0,maxX:2,minY:0,maxY:2},rows,zones,overviewPng:png,measurementCount:2,histogram:{stats:{count:2,min:500,average:510,median:510,max:520},bins:[{index:0,low:500,high:510,count:1,percent:50,cumulative:1,cumulativePercent:50},{index:1,low:510,high:520,count:1,percent:50,cumulative:2,cumulativePercent:100}],imagePng:png}}] };
const blob = await buildComponentReportXlsx(report);
const bytes = new Uint8Array(await blob.arrayBuffer());
assert(bytes.length > 5000);
const zip = new ZipArchive(bytes);
assert(zip.entries.has('xl/workbook.xml'));
assert(zip.entries.has('xl/media/image1.png'));
const mapSheetXml = await zip.read('xl/worksheets/sheet2.xml', 'text');
assert(mapSheetXml.indexOf('<pageSetup') < mapSheetXml.indexOf('<drawing'), 'drawing must follow page setup for Excel compatibility');
const parsed = await parseXlsx(bytes.buffer);
assert(parsed.sheets.length >= 8);
assert.equal(parsed.sheets[0].name, 'Summary');
assert(parsed.sheets.some(s=>s.name.startsWith('Map U1')));
console.log(`xlsx report ok: ${bytes.length} bytes, ${parsed.sheets.length} sheets`);
