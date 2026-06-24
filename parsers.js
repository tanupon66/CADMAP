import { ZipArchive } from './zip-reader.js';

function decodeXml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attrs(text = '') {
  const result = {};
  const re = /([:\w.-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let match;
  while ((match = re.exec(text))) result[match[1]] = decodeXml(match[3]);
  return result;
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function colFromRef(ref = '') {
  const letters = (ref.match(/[A-Z]+/i) || [''])[0].toUpperCase();
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, value - 1);
}

export function columnName(index) {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function normalizePath(path) {
  const parts = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let si;
  while ((si = siRe.exec(xml))) {
    let text = '';
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(si[1]))) text += decodeXml(t[1]);
    strings.push(text);
  }
  return strings;
}

function parseSheetXml(xml, sharedStrings) {
  const rows = [];
  let maxCol = 0;
  const sheetStart = xml.indexOf('<sheetData');
  const dataStart = sheetStart >= 0 ? xml.indexOf('>', sheetStart) + 1 : 0;
  const dataEnd = sheetStart >= 0 ? xml.indexOf('</sheetData>', dataStart) : xml.length;
  let cursor = dataStart;

  while (cursor >= 0 && cursor < dataEnd) {
    const rowStart = xml.indexOf('<row', cursor);
    if (rowStart < 0 || rowStart >= dataEnd) break;
    const rowOpenEnd = xml.indexOf('>', rowStart);
    const rowEnd = xml.indexOf('</row>', rowOpenEnd);
    if (rowOpenEnd < 0 || rowEnd < 0) break;
    const row = [];
    let cellCursor = rowOpenEnd + 1;

    while (cellCursor < rowEnd) {
      const cellStart = xml.indexOf('<c', cellCursor);
      if (cellStart < 0 || cellStart >= rowEnd) break;
      const afterC = xml.charCodeAt(cellStart + 2);
      if (afterC !== 32 && afterC !== 9 && afterC !== 13 && afterC !== 10 && afterC !== 62) {
        cellCursor = cellStart + 2;
        continue;
      }
      const cellOpenEnd = xml.indexOf('>', cellStart);
      const cellEnd = xml.indexOf('</c>', cellOpenEnd);
      if (cellOpenEnd < 0 || cellEnd < 0 || cellEnd > rowEnd) break;
      const openTag = xml.slice(cellStart + 2, cellOpenEnd);
      const refMatch = openTag.match(/\br=["']([^"']+)["']/);
      const typeMatch = openTag.match(/\bt=["']([^"']+)["']/);
      const index = colFromRef(refMatch?.[1] || 'A1');
      maxCol = Math.max(maxCol, index);
      const type = typeMatch?.[1] || '';
      const valueStart = xml.indexOf('<v>', cellOpenEnd);
      let raw = null;
      if (valueStart >= 0 && valueStart < cellEnd) {
        const valueEnd = xml.indexOf('</v>', valueStart + 3);
        if (valueEnd >= 0 && valueEnd <= cellEnd) raw = xml.slice(valueStart + 3, valueEnd);
      }
      let value = null;
      if (type === 's' && raw != null) value = sharedStrings[Number(raw)] ?? '';
      else if (type === 'inlineStr') {
        const tStart = xml.indexOf('<t', cellOpenEnd);
        if (tStart >= 0 && tStart < cellEnd) {
          const tOpenEnd = xml.indexOf('>', tStart);
          const tEnd = xml.indexOf('</t>', tOpenEnd);
          if (tEnd >= 0 && tEnd <= cellEnd) value = decodeXml(xml.slice(tOpenEnd + 1, tEnd));
        }
      } else if ((type === 'str' || type === 'e') && raw != null) value = decodeXml(raw);
      else if (type === 'b' && raw != null) value = raw === '1';
      else if (raw != null) {
        const decoded = decodeXml(raw);
        const n = Number(decoded);
        value = decoded !== '' && Number.isFinite(n) ? n : decoded;
      }
      row[index] = value;
      cellCursor = cellEnd + 4;
    }
    rows.push(row);
    cursor = rowEnd + 6;
  }

  for (const row of rows) row.length = maxCol + 1;
  return rows;
}

export async function parseXlsx(arrayBuffer) {
  const zip = new ZipArchive(arrayBuffer);
  const workbookXml = await zip.read('xl/workbook.xml', 'text');
  const relsXml = await zip.read('xl/_rels/workbook.xml.rels', 'text');
  const sharedEntry = zip.find((entry) => /(^|\/)sharedStrings\.xml$/i.test(entry.name));
  const sharedStrings = sharedEntry ? parseSharedStrings(await zip.read(sharedEntry.name, 'text')) : [];

  const relationTargets = new Map();
  const relRe = /<Relationship\b([^>]*)\/?\s*>/g;
  let rel;
  while ((rel = relRe.exec(relsXml))) {
    const a = attrs(rel[1]);
    if (a.Id && a.Target) relationTargets.set(a.Id, a.Target);
  }

  const sheets = [];
  const sheetRe = /<sheet\b([^>]*)\/?\s*>/g;
  let sheet;
  while ((sheet = sheetRe.exec(workbookXml))) {
    const a = attrs(sheet[1]);
    const relId = a['r:id'];
    const target = relationTargets.get(relId) || `worksheets/sheet${sheets.length + 1}.xml`;
    const path = normalizePath(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    const xml = await zip.read(path, 'text');
    sheets.push({ name: a.name || `Sheet${sheets.length + 1}`, rows: parseSheetXml(xml, sharedStrings) });
  }

  if (!sheets.length) {
    const fallback = zip.find((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name));
    if (!fallback) throw new Error('ไม่พบ Worksheet ในไฟล์ XLSX');
    sheets.push({ name: 'Sheet1', rows: parseSheetXml(await zip.read(fallback.name, 'text'), sharedStrings) });
  }

  return { sheets, activeSheet: sheets[0] };
}

export function parseInspectionXml(xmlText) {
  const boardTag = xmlText.match(/<BoardInformation\b([^>]*)\/?\s*>/);
  const board = boardTag ? attrs(boardTag[1]) : {};
  board.Width = numberOrNull(board.Width);
  board.Height = numberOrNull(board.Height);
  board.Thickness = numberOrNull(board.Thickness);

  const components = [];
  const componentById = new Map();
  const componentRe = /<ComponentInformation\b([^>]*)>([\s\S]*?)<\/ComponentInformation>/g;
  let componentMatch;
  while ((componentMatch = componentRe.exec(xmlText))) {
    const a = attrs(componentMatch[1]);
    const body = componentMatch[2];
    const itemTag = body.match(/<ComponentInformationItem\b([^>]*)>/);
    const posTag = body.match(/<PositionAngle\b([^>]*)\/?\s*>/);
    const item = itemTag ? attrs(itemTag[1]) : {};
    const pos = posTag ? attrs(posTag[1]) : {};
    const component = {
      id: String(a.Id ?? ''),
      name: a.Name || '',
      packageName: item.ComponentNumberId || '',
      revision: item.ComponentNumberRevision || '',
      centerX: numberOrNull(pos.CenterPosX),
      centerY: numberOrNull(pos.CenterPosY),
      angle: numberOrNull(pos.Angle),
      lands: [],
    };
    components.push(component);
    componentById.set(component.id, component);
  }

  const landRe = /<LandNumber\b([^>]*)>([\s\S]*?)<\/LandNumber>/g;
  let landMatch;
  let totalLands = 0;
  while ((landMatch = landRe.exec(xmlText))) {
    const a = attrs(landMatch[1]);
    const landTag = landMatch[2].match(/<Land\b([^>]*)>/);
    if (!landTag) continue;
    const g = attrs(landTag[1]);
    const left = numberOrNull(g.Left);
    const top = numberOrNull(g.Top);
    const width = numberOrNull(g.Width);
    const length = numberOrNull(g.Length);
    const land = {
      globalId: numberOrNull(a.LandId),
      componentId: String(a.Component ?? ''),
      cadName: a.Name || '',
      side: a.Side || '',
      left,
      top,
      width,
      length,
      centerX: left != null && width != null ? left + width / 2 : left,
      centerY: top != null && length != null ? top - length / 2 : top,
      localIndex: null,
    };
    const component = componentById.get(land.componentId);
    if (component) component.lands.push(land);
    totalLands += 1;
  }

  for (const component of components) {
    component.lands.sort((a, b) => (a.globalId ?? 0) - (b.globalId ?? 0));
    component.lands.forEach((land, index) => { land.localIndex = index + 1; });
    if (component.lands.length) {
      const xs = component.lands.map((land) => land.centerX).filter(Number.isFinite);
      const ys = component.lands.map((land) => land.centerY).filter(Number.isFinite);
      component.bounds = {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
      };
      const minId = component.lands[0].globalId;
      const contiguous = component.lands.every((land, index) => land.globalId === minId + index);
      component.contiguousGlobalIds = contiguous;
      component.offset = contiguous ? minId - 1 : null;
    }
  }

  return {
    board,
    components,
    componentById,
    totalLands,
    sourceSize: xmlText.length,
  };
}

function valuesAt(rows, col, limit = 4000) {
  const result = [];
  for (let i = 1; i < rows.length && result.length < limit; i += 1) {
    const value = rows[i]?.[col];
    if (value !== null && value !== undefined && value !== '') result.push(value);
  }
  return result;
}

function majorityValue(values) {
  const counts = new Map();
  for (const value of values) counts.set(String(value), (counts.get(String(value)) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
}

export function autoDetectSchema(rows, xmlData) {
  const maxCols = Math.max(0, ...rows.map((row) => row.length));
  const normalizeMatch = (value) => String(value ?? '').trim().toLocaleUpperCase();
  const componentNames = new Set(xmlData.components.map((component) => normalizeMatch(component.name)).filter(Boolean));
  const packageNames = new Set(xmlData.components.map((component) => normalizeMatch(component.packageName)).filter(Boolean));
  const descriptors = [];

  for (let col = 0; col < maxCols; col += 1) {
    const values = valuesAt(rows, col);
    const [majority, majorityCount] = majorityValue(values);
    const numeric = values.filter((value) => Number.isFinite(Number(value)));
    const integers = numeric.filter((value) => Number.isInteger(Number(value)) && Number(value) > 0);
    const unique = new Set(values.map(String));
    const componentHits = values.filter((value) => componentNames.has(normalizeMatch(value))).length;
    const packageHits = values.filter((value) => packageNames.has(normalizeMatch(value))).length;
    let sequentialHits = 0;
    for (let i = 0; i < Math.min(values.length, 1500); i += 1) {
      if (Number(values[i]) === i + 1) sequentialHits += 1;
    }
    descriptors.push({
      col,
      header: rows[0]?.[col] ?? '',
      sample: values[0] ?? '',
      values,
      majority,
      majorityRatio: values.length ? majorityCount / values.length : 0,
      numericRatio: values.length ? numeric.length / values.length : 0,
      integerRatio: values.length ? integers.length / values.length : 0,
      uniqueCount: unique.size,
      componentHits,
      packageHits,
      sequentialRatio: values.length ? sequentialHits / Math.min(values.length, 1500) : 0,
    });
  }

  const best = (key) => [...descriptors].sort((a, b) => b[key] - a[key])[0]?.col ?? 0;
  const componentCol = best('componentHits');
  const packageCol = best('packageHits');
  const featureCol = descriptors.find((d) => String(d.majority).toLowerCase() === 'land' && d.majorityRatio > 0.7)?.col ?? null;

  const landCandidates = descriptors
    .filter((d) => d.col !== componentCol && d.col !== packageCol && d.integerRatio > 0.95 && d.uniqueCount > 10)
    .map((d) => ({ ...d, score: d.sequentialRatio * 4 + Math.min(1, d.uniqueCount / 1000) }))
    .sort((a, b) => b.score - a.score || a.col - b.col);
  const landCol = landCandidates[0]?.col ?? 0;

  let measurementCol = null;
  const pixelDescriptor = descriptors.find((d) => String(d.majority).toLowerCase() === 'pixel' && d.majorityRatio > 0.7);
  if (pixelDescriptor && pixelDescriptor.col + 1 < maxCols) measurementCol = pixelDescriptor.col + 1;
  if (measurementCol == null) {
    measurementCol = descriptors
      .filter((d) => d.col !== landCol && d.numericRatio > 0.9 && d.uniqueCount > 10 && d.uniqueCount < Math.max(20, rows.length * 0.75))
      .sort((a, b) => b.uniqueCount - a.uniqueCount)[0]?.col ?? null;
  }

  return {
    componentCol,
    packageCol,
    featureCol,
    landCol,
    measurementCol,
    descriptors,
    alternates: { land: landCandidates.slice(1, 4).map((d) => d.col) },
  };
}

function confidenceFor({ exactComponent, exactPackage, countMatch, contiguous }) {
  let score = 0;
  if (exactComponent) score += 55;
  if (exactPackage) score += 25;
  if (countMatch) score += 15;
  if (contiguous) score += 5;
  return Math.min(100, score);
}

export function buildMappings(xmlData, xlsxData, schema) {
  const rows = xlsxData.activeSheet.rows;
  const dataRows = rows.slice(1);
  const normalize = (value) => String(value ?? '').trim().toLocaleUpperCase();
  const componentsByName = new Map();
  for (const component of xmlData.components) {
    const key = normalize(component.name);
    if (!componentsByName.has(key)) componentsByName.set(key, []);
    componentsByName.get(key).push(component);
  }

  const resolveComponent = (componentName, packageName) => {
    const candidates = componentsByName.get(normalize(componentName)) || [];
    if (!candidates.length) return null;
    const normalizedPackage = normalize(packageName);
    if (normalizedPackage) {
      const exactPackage = candidates.find((component) => normalize(component.packageName) === normalizedPackage);
      if (exactPackage) return exactPackage;
    }
    return candidates.length === 1 ? candidates[0] : candidates[0];
  };

  // Group by the parts that really exist in the raw X-ray data. The viewer uses
  // these groups instead of exposing every component found in the CAD XML.
  const rawGroups = new Map();
  for (const row of dataRows) {
    if (!row || row.every((value) => value == null || value === '')) continue;
    const componentName = String(row?.[schema.componentCol] ?? '').trim();
    const packageName = String(row?.[schema.packageCol] ?? '').trim();
    const key = `${normalize(componentName)}\u0000${normalize(packageName)}`;
    const group = rawGroups.get(key) || { key, componentName, packageName, count: 0 };
    group.count += 1;
    rawGroups.set(key, group);
  }

  const cadNameCounts = new Map();
  for (const component of xmlData.components) {
    for (const land of component.lands) {
      const key = `${component.id}\u0000${land.cadName}`;
      cadNameCounts.set(key, (cadNameCounts.get(key) || 0) + 1);
    }
  }

  const mappings = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    if (!row || row.every((value) => value == null || value === '')) continue;
    const componentName = String(row[schema.componentCol] ?? '').trim();
    const packageName = String(row[schema.packageCol] ?? '').trim();
    const localIndex = Number(row[schema.landCol]);
    const rawKey = `${normalize(componentName)}\u0000${normalize(packageName)}`;
    const component = resolveComponent(componentName, packageName);
    const land = component && Number.isInteger(localIndex) && localIndex > 0 ? component.lands[localIndex - 1] : null;
    const countMatch = component ? rawGroups.get(rawKey)?.count === component.lands.length : false;
    const exactPackage = Boolean(component && packageName && normalize(component.packageName) === normalize(packageName));
    const confidence = confidenceFor({
      exactComponent: Boolean(component), exactPackage, countMatch,
      contiguous: Boolean(component?.contiguousGlobalIds),
    });

    mappings.push({
      sourceRow: i + 2,
      rawPartKey: rawKey,
      componentName,
      packageName,
      localIndex: Number.isFinite(localIndex) ? localIndex : null,
      componentId: component?.id ?? null,
      globalId: land?.globalId ?? null,
      cadName: land?.cadName ?? '',
      left: land?.left ?? null,
      top: land?.top ?? null,
      centerX: land?.centerX ?? null,
      centerY: land?.centerY ?? null,
      width: land?.width ?? null,
      length: land?.length ?? null,
      measurement: schema.measurementCol == null ? null : row[schema.measurementCol],
      confidence,
      mapped: Boolean(land),
      manual: false,
      duplicateCadNameCount: land ? (cadNameCounts.get(`${component.id}\u0000${land.cadName}`) || 1) : 0,
      raw: row,
    });
  }

  const componentSummaries = [];
  for (const group of rawGroups.values()) {
    const component = resolveComponent(group.componentName, group.packageName);
    componentSummaries.push({
      rawPartKey: group.key,
      componentName: group.componentName,
      xrayCount: group.count,
      xmlCount: component?.lands.length ?? 0,
      componentId: component?.id ?? null,
      packageName: group.packageName || component?.packageName || '',
      cadPackageName: component?.packageName ?? '',
      contiguous: component?.contiguousGlobalIds ?? false,
      offset: component?.offset ?? null,
      countMatch: Boolean(component && component.lands.length === group.count),
      matched: Boolean(component),
    });
  }
  componentSummaries.sort((a, b) => a.componentName.localeCompare(b.componentName, undefined, { numeric: true }) || a.packageName.localeCompare(b.packageName));

  return {
    mappings,
    componentSummaries,
    stats: {
      total: mappings.length,
      mapped: mappings.filter((m) => m.mapped).length,
      unmapped: mappings.filter((m) => !m.mapped).length,
      duplicateCadNames: mappings.filter((m) => m.duplicateCadNameCount > 1).length,
      rawParts: componentSummaries.length,
      matchedRawParts: componentSummaries.filter((summary) => summary.matched).length,
    },
  };
}

export async function extractProjectFiles(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xml')) return { xmlText: await file.text(), xlsxBuffer: null, names: { xml: file.name } };
  if (name.endsWith('.xlsx')) return { xmlText: null, xlsxBuffer: await file.arrayBuffer(), names: { xlsx: file.name } };
  if (!name.endsWith('.zip')) throw new Error('รองรับ ZIP, XML และ XLSX เท่านั้น');

  const zip = new ZipArchive(await file.arrayBuffer());
  const xmlEntry = zip.find((entry) => !entry.isDirectory && /\.xml$/i.test(entry.name) && !/^xl\//i.test(entry.name));
  const xlsxEntry = zip.find((entry) => !entry.isDirectory && /\.xlsx$/i.test(entry.name));
  if (!xmlEntry && !xlsxEntry) throw new Error('ไม่พบไฟล์ XML หรือ XLSX ภายใน ZIP');
  return {
    xmlText: xmlEntry ? await zip.read(xmlEntry.name, 'text') : null,
    xlsxBuffer: xlsxEntry ? await zip.read(xlsxEntry.name, 'arraybuffer') : null,
    names: { xml: xmlEntry?.name || '', xlsx: xlsxEntry?.name || '' },
  };
}
