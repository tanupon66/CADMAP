import {
  autoDetectSchema,
  buildMappings,
  columnName,
  extractProjectFiles,
  parseInspectionXml,
  parseXlsx,
} from './parsers.js';

const $ = (id) => document.getElementById(id);
const els = {
  projectFile: $('projectFile'), dropZone: $('dropZone'), resetButton: $('resetButton'),
  xmlFileName: $('xmlFileName'), xlsxFileName: $('xlsxFileName'), importMessage: $('importMessage'),
  progressWrap: $('progressWrap'), projectStatus: $('projectStatus'),
  componentColumn: $('componentColumn'), packageColumn: $('packageColumn'), landColumn: $('landColumn'),
  measurementColumn: $('measurementColumn'), resultColumn: $('resultColumn'), remapButton: $('remapButton'),
  mappedStat: $('mappedStat'), unmappedStat: $('unmappedStat'), xmlLandStat: $('xmlLandStat'), componentStat: $('componentStat'),
  mappingFormula: $('mappingFormula'), componentSelect: $('componentSelect'), heatmapToggle: $('heatmapToggle'), labelToggle: $('labelToggle'),
  fitButton: $('fitButton'), zoomInButton: $('zoomInButton'), zoomOutButton: $('zoomOutButton'),
  searchInput: $('searchInput'), searchButton: $('searchButton'), manualButton: $('manualButton'), undoButton: $('undoButton'),
  exportCsvButton: $('exportCsvButton'), exportJsonButton: $('exportJsonButton'),
  canvas: $('cadCanvas'), viewerTitle: $('viewerTitle'), viewerSubtitle: $('viewerSubtitle'), tooltip: $('tooltip'), manualBanner: $('manualBanner'),
  tableFilter: $('tableFilter'), mappingTableBody: $('mappingTableBody'), tableSummary: $('tableSummary'), prevPage: $('prevPage'), nextPage: $('nextPage'), pageLabel: $('pageLabel'),
  selectedTitle: $('selectedTitle'), selectedSubTitle: $('selectedSubTitle'), dLocal: $('dLocal'), dGlobal: $('dGlobal'), dCad: $('dCad'), dComponent: $('dComponent'),
  dX: $('dX'), dY: $('dY'), dMeasurement: $('dMeasurement'), dResult: $('dResult'), dConfidence: $('dConfidence'), dRow: $('dRow'),
  aliasInput: $('aliasInput'), saveAliasButton: $('saveAliasButton'), duplicateWarning: $('duplicateWarning'), rawData: $('rawData'), copyRawButton: $('copyRawButton'),
  toast: $('toast'), installButton: $('installButton'),
};

const state = {
  xmlText: null,
  xlsxBuffer: null,
  xmlData: null,
  xlsxData: null,
  schema: null,
  mappingData: null,
  selectedComponentId: null,
  selected: null,
  hoveredLand: null,
  manualMode: false,
  undoStack: [],
  page: 1,
  pageSize: 80,
  filter: 'all',
  view: { scale: 1, offsetX: 0, offsetY: 0 },
  dragging: false,
  lastPointer: null,
  dragStart: null,
  fileNames: { xml: '', xlsx: '' },
  installPrompt: null,
};

const ctx = els.canvas.getContext('2d', { alpha: false });
const formatInt = new Intl.NumberFormat('th-TH');
const formatFloat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 });

function toast(message, timeout = 2600) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.add('hidden'), timeout);
}

function setLoading(active, message = '') {
  els.progressWrap.classList.toggle('hidden', !active);
  if (message) els.importMessage.textContent = message;
  document.body.style.cursor = active ? 'progress' : '';
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function currentComponent() {
  return state.xmlData?.componentById.get(String(state.selectedComponentId)) || null;
}

function currentMappings() {
  if (!state.mappingData) return [];
  return state.mappingData.mappings.filter((mapping) => String(mapping.componentId) === String(state.selectedComponentId));
}

function mappingByGlobalId() {
  const map = new Map();
  for (const mapping of currentMappings()) {
    if (mapping.globalId != null) map.set(Number(mapping.globalId), mapping);
  }
  return map;
}

function columnOptionLabel(descriptor) {
  const header = descriptor.header ? String(descriptor.header) : 'ไม่มีหัวคอลัมน์';
  const sample = descriptor.sample !== '' ? `ตัวอย่าง ${String(descriptor.sample).slice(0, 28)}` : 'ไม่มีข้อมูล';
  return `${columnName(descriptor.col)} · ${header} · ${sample}`;
}

function fillColumnSelect(select, descriptors, selected, optional = false) {
  select.innerHTML = '';
  if (optional) {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— ไม่ใช้คอลัมน์นี้ —';
    select.append(none);
  }
  for (const descriptor of descriptors) {
    const option = document.createElement('option');
    option.value = String(descriptor.col);
    option.textContent = columnOptionLabel(descriptor);
    option.selected = descriptor.col === selected;
    select.append(option);
  }
}

function readSchemaControls() {
  const optional = (select) => select.value === '' ? null : Number(select.value);
  return {
    ...state.schema,
    componentCol: Number(els.componentColumn.value),
    packageCol: Number(els.packageColumn.value),
    landCol: Number(els.landColumn.value),
    measurementCol: optional(els.measurementColumn),
    resultCol: optional(els.resultColumn),
  };
}

function populateSchemaControls() {
  if (!state.schema) return;
  const d = state.schema.descriptors;
  fillColumnSelect(els.componentColumn, d, state.schema.componentCol);
  fillColumnSelect(els.packageColumn, d, state.schema.packageCol);
  fillColumnSelect(els.landColumn, d, state.schema.landCol);
  fillColumnSelect(els.measurementColumn, d, state.schema.measurementCol, true);
  fillColumnSelect(els.resultColumn, d, state.schema.resultCol, true);
}

function populateComponents(preferredId = null) {
  els.componentSelect.innerHTML = '';
  if (!state.xmlData) return;
  const components = [...state.xmlData.components]
    .filter((component) => component.lands.length)
    .sort((a, b) => b.lands.length - a.lands.length || a.name.localeCompare(b.name));
  for (const component of components) {
    const option = document.createElement('option');
    option.value = component.id;
    option.textContent = `${component.name || `ID ${component.id}`} · ${formatInt.format(component.lands.length)} lands · ${component.packageName || 'ไม่ทราบ package'}`;
    els.componentSelect.append(option);
  }
  const mappedFirst = state.mappingData?.componentSummaries.find((summary) => summary.countMatch)?.componentId;
  const chosen = preferredId || mappedFirst || components[0]?.id || null;
  if (chosen != null) {
    state.selectedComponentId = String(chosen);
    els.componentSelect.value = String(chosen);
  }
}

function updateStats() {
  const stats = state.mappingData?.stats;
  els.mappedStat.textContent = formatInt.format(stats?.mapped || 0);
  els.unmappedStat.textContent = formatInt.format(stats?.unmapped || 0);
  els.xmlLandStat.textContent = formatInt.format(state.xmlData?.totalLands || 0);
  els.componentStat.textContent = formatInt.format(state.xmlData?.components.length || 0);

  const summary = state.mappingData?.componentSummaries.find((item) => String(item.componentId) === String(state.selectedComponentId))
    || state.mappingData?.componentSummaries[0];
  if (summary?.countMatch) {
    els.mappingFormula.innerHTML = summary.contiguous
      ? `Component ${summary.componentName}: XML ID = X-ray Land + ${formatInt.format(summary.offset)}<br>ตรวจสอบด้วยลำดับใน Component จำนวน ${formatInt.format(summary.xmlCount)} จุด`
      : `Component ${summary.componentName}: ใช้ X-ray Land เป็นลำดับที่ n ของรายการ XML ที่เรียงตาม global ID`;
  } else if (summary) {
    els.mappingFormula.textContent = `จำนวนไม่ตรงกัน: X-ray ${summary.xrayCount} / XML ${summary.xmlCount} ต้องตรวจสอบก่อนใช้`; 
  } else {
    els.mappingFormula.textContent = 'ยังไม่มีสูตร Mapping';
  }

  const ready = Boolean(state.xmlData && state.xlsxData && state.mappingData);
  els.projectStatus.textContent = ready ? `พร้อม · ${formatInt.format(stats.mapped)} mapped` : state.xmlData ? 'เปิด XML แล้ว' : 'ยังไม่ได้เปิดโปรเจกต์';
  els.projectStatus.className = `status-pill ${ready ? 'ready' : 'muted'}`;
  els.remapButton.disabled = !state.xmlData || !state.xlsxData;
  els.exportCsvButton.disabled = !ready;
  els.exportJsonButton.disabled = !ready;
  els.manualButton.disabled = !state.selected;
}

function runMapping() {
  if (!state.xmlData || !state.xlsxData) return;
  state.schema = readSchemaControls();
  state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema);
  const firstMapped = state.mappingData.mappings.find((mapping) => mapping.mapped);
  populateComponents(firstMapped?.componentId || state.selectedComponentId);
  state.page = 1;
  updateStats();
  renderTable();
  fitView();
  draw();
  toast(`จับคู่สำเร็จ ${formatInt.format(state.mappingData.stats.mapped)} จาก ${formatInt.format(state.mappingData.stats.total)} รายการ`);
}

async function processFile(file) {
  if (!file) return;
  setLoading(true, `กำลังเปิด ${file.name}…`);
  await nextFrame();
  try {
    const project = await extractProjectFiles(file);
    if (project.xmlText) {
      state.xmlText = project.xmlText;
      state.fileNames.xml = project.names.xml || file.name;
      els.importMessage.textContent = 'กำลังอ่าน Component และ Land จาก XML…';
      await nextFrame();
      state.xmlData = parseInspectionXml(project.xmlText);
    }
    if (project.xlsxBuffer) {
      state.xlsxBuffer = project.xlsxBuffer;
      state.fileNames.xlsx = project.names.xlsx || file.name;
      els.importMessage.textContent = 'กำลังอ่านตารางผล X-ray จาก XLSX…';
      await nextFrame();
      state.xlsxData = await parseXlsx(project.xlsxBuffer);
    }

    els.xmlFileName.textContent = state.fileNames.xml || '—';
    els.xlsxFileName.textContent = state.fileNames.xlsx || '—';

    if (state.xmlData) populateComponents(state.selectedComponentId);
    if (state.xmlData && state.xlsxData) {
      els.importMessage.textContent = 'กำลังตรวจหาคอลัมน์และสร้าง Mapping…';
      await nextFrame();
      state.schema = autoDetectSchema(state.xlsxData.activeSheet.rows, state.xmlData);
      populateSchemaControls();
      state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema);
      const firstMapped = state.mappingData.mappings.find((mapping) => mapping.mapped);
      populateComponents(firstMapped?.componentId);
      renderTable();
      const summary = state.mappingData.componentSummaries[0];
      if (summary?.countMatch) {
        els.importMessage.textContent = `ตรวจพบ ${summary.componentName}: X-ray และ XML ตรงกัน ${formatInt.format(summary.xmlCount)} Land`;
      } else {
        els.importMessage.textContent = 'เปิดไฟล์แล้ว แต่จำนวน Land บาง Component ไม่ตรงกัน กรุณาตรวจคอลัมน์';
      }
    } else {
      els.importMessage.textContent = state.xmlData ? 'เปิด XML แล้ว กรุณาเลือก XLSX เพิ่ม' : 'เปิด XLSX แล้ว กรุณาเลือก XML เพิ่ม';
    }
    updateStats();
    fitView();
    draw();
  } catch (error) {
    console.error(error);
    els.importMessage.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
    toast(error.message, 5200);
  } finally {
    setLoading(false);
    els.projectFile.value = '';
  }
}

function resetProject() {
  Object.assign(state, {
    xmlText: null, xlsxBuffer: null, xmlData: null, xlsxData: null, schema: null, mappingData: null,
    selectedComponentId: null, selected: null, hoveredLand: null, manualMode: false, undoStack: [], page: 1,
    fileNames: { xml: '', xlsx: '' }, view: { scale: 1, offsetX: 0, offsetY: 0 }, dragStart: null,
  });
  els.xmlFileName.textContent = '—';
  els.xlsxFileName.textContent = '—';
  els.importMessage.textContent = 'ไฟล์จะถูกประมวลผลในเครื่อง ไม่อัปโหลดไปยังเซิร์ฟเวอร์';
  for (const select of [els.componentColumn, els.packageColumn, els.landColumn, els.measurementColumn, els.resultColumn, els.componentSelect]) select.innerHTML = '';
  els.mappingTableBody.innerHTML = '';
  clearDetails();
  updateStats();
  draw();
}

function filteredMappings() {
  const mappings = currentMappings();
  switch (state.filter) {
    case 'code0': return mappings.filter((m) => Number(m.resultCode) === 0);
    case 'other': return mappings.filter((m) => m.resultCode != null && Number(m.resultCode) !== 0);
    case 'duplicate': return mappings.filter((m) => m.duplicateCadNameCount > 1);
    case 'manual': return mappings.filter((m) => m.manual);
    case 'unmapped': return mappings.filter((m) => !m.mapped);
    default: return mappings;
  }
}

function renderTable() {
  const all = filteredMappings();
  const pages = Math.max(1, Math.ceil(all.length / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * state.pageSize;
  const rows = all.slice(start, start + state.pageSize);
  els.mappingTableBody.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const mapping of rows) {
    const tr = document.createElement('tr');
    if (state.selected === mapping) tr.classList.add('active');
    const cells = [
      mapping.localIndex, mapping.globalId, mapping.alias || mapping.cadName || 'Unmapped',
      Number.isFinite(mapping.centerX) ? formatFloat.format(mapping.centerX) : '—',
      Number.isFinite(mapping.centerY) ? formatFloat.format(mapping.centerY) : '—',
      mapping.measurement ?? '—', mapping.resultCode ?? '—', `${mapping.confidence}%`,
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    tr.addEventListener('click', () => selectMapping(mapping, true));
    fragment.append(tr);
  }
  els.mappingTableBody.append(fragment);
  els.tableSummary.textContent = `${formatInt.format(all.length)} รายการ`;
  els.pageLabel.textContent = `${state.page} / ${pages}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= pages;
}

function selectMapping(mapping, center = false) {
  state.selected = mapping;
  state.manualMode = false;
  els.manualBanner.classList.add('hidden');
  if (mapping.componentId != null && String(mapping.componentId) !== String(state.selectedComponentId)) {
    state.selectedComponentId = String(mapping.componentId);
    els.componentSelect.value = String(mapping.componentId);
    fitView();
  }
  updateDetails();
  renderTable();
  if (center && Number.isFinite(mapping.centerX) && Number.isFinite(mapping.centerY)) centerOn(mapping.centerX, mapping.centerY);
  draw();
}

function clearDetails() {
  state.selected = null;
  els.selectedTitle.textContent = 'ยังไม่ได้เลือก';
  els.selectedSubTitle.textContent = 'ค้นหาหรือคลิกตำแหน่งบนกราฟิก';
  for (const el of [els.dLocal, els.dGlobal, els.dCad, els.dComponent, els.dX, els.dY, els.dMeasurement, els.dResult, els.dConfidence, els.dRow]) el.textContent = '—';
  els.rawData.textContent = '—';
  els.aliasInput.value = '';
  els.aliasInput.disabled = true;
  els.saveAliasButton.disabled = true;
  els.copyRawButton.disabled = true;
  els.duplicateWarning.classList.add('hidden');
  els.manualButton.disabled = true;
}

function updateDetails() {
  const mapping = state.selected;
  if (!mapping) return clearDetails();
  els.selectedTitle.textContent = mapping.alias || mapping.cadName || `Land ${mapping.localIndex}`;
  els.selectedSubTitle.textContent = `${mapping.componentName || 'Unknown component'} · ${mapping.packageName || 'Unknown package'}`;
  els.dLocal.textContent = mapping.localIndex ?? '—';
  els.dGlobal.textContent = mapping.globalId ?? '—';
  els.dCad.textContent = mapping.cadName || '—';
  els.dComponent.textContent = mapping.componentName || '—';
  els.dX.textContent = Number.isFinite(mapping.centerX) ? `${formatFloat.format(mapping.centerX)} mm` : '—';
  els.dY.textContent = Number.isFinite(mapping.centerY) ? `${formatFloat.format(mapping.centerY)} mm` : '—';
  els.dMeasurement.textContent = mapping.measurement ?? '—';
  els.dResult.textContent = mapping.resultCode ?? '—';
  els.dConfidence.textContent = `${mapping.confidence ?? 0}%${mapping.manual ? ' · manual' : ''}`;
  els.dRow.textContent = mapping.sourceRow ?? '—';
  els.aliasInput.disabled = false;
  els.saveAliasButton.disabled = false;
  els.copyRawButton.disabled = !mapping.raw;
  els.aliasInput.value = mapping.alias || '';
  els.rawData.textContent = mapping.raw
    ? mapping.raw.map((value, index) => `${columnName(index)}: ${value ?? ''}`).join('\n')
    : JSON.stringify(mapping, null, 2);
  if (mapping.duplicateCadNameCount > 1) {
    els.duplicateWarning.textContent = `ชื่อ CAD ${mapping.cadName} พบซ้ำ ${mapping.duplicateCadNameCount} ตำแหน่ง จึงต้องอ้างอิง X-ray Land, XML ID และพิกัดร่วมกัน`;
    els.duplicateWarning.classList.remove('hidden');
  } else {
    els.duplicateWarning.classList.add('hidden');
  }
  els.manualButton.disabled = !mapping;
  document.querySelector('.right-panel')?.classList.add('open');
}

function getCanvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function worldToScreen(x, y) {
  return { x: x * state.view.scale + state.view.offsetX, y: -y * state.view.scale + state.view.offsetY };
}

function screenToWorld(x, y) {
  return { x: (x - state.view.offsetX) / state.view.scale, y: (state.view.offsetY - y) / state.view.scale };
}

function fitView() {
  const component = currentComponent();
  if (!component?.bounds || !els.canvas.clientWidth || !els.canvas.clientHeight) return;
  const { minX, maxX, minY, maxY } = component.bounds;
  const pad = 24;
  const width = Math.max(1, maxX - minX + 3);
  const height = Math.max(1, maxY - minY + 3);
  const scale = Math.max(0.1, Math.min((els.canvas.clientWidth - pad * 2) / width, (els.canvas.clientHeight - pad * 2) / height));
  state.view.scale = scale;
  state.view.offsetX = els.canvas.clientWidth / 2 - ((minX + maxX) / 2) * scale;
  state.view.offsetY = els.canvas.clientHeight / 2 + ((minY + maxY) / 2) * scale;
  draw();
}

function centerOn(x, y) {
  state.view.offsetX = els.canvas.clientWidth / 2 - x * state.view.scale;
  state.view.offsetY = els.canvas.clientHeight / 2 + y * state.view.scale;
  draw();
}

function zoomAt(factor, screenX = els.canvas.clientWidth / 2, screenY = els.canvas.clientHeight / 2) {
  const world = screenToWorld(screenX, screenY);
  const newScale = Math.min(450, Math.max(0.25, state.view.scale * factor));
  state.view.scale = newScale;
  state.view.offsetX = screenX - world.x * newScale;
  state.view.offsetY = screenY + world.y * newScale;
  draw();
}

function resultColor(mapping, minMeasurement, maxMeasurement) {
  if (els.heatmapToggle.checked && mapping && Number.isFinite(Number(mapping.measurement)) && maxMeasurement > minMeasurement) {
    const ratio = (Number(mapping.measurement) - minMeasurement) / (maxMeasurement - minMeasurement);
    const hue = 210 - ratio * 190;
    return `hsl(${hue} 78% 58%)`;
  }
  if (!mapping) return '#506078';
  if (Number(mapping.resultCode) === 0) return '#ff6b75';
  if (mapping.resultCode != null) return '#5cd8a6';
  return '#62a9e8';
}

function drawGrid(width, height) {
  const spacingWorld = state.view.scale < 5 ? 20 : state.view.scale < 15 ? 10 : state.view.scale < 45 ? 5 : 1;
  const spacing = spacingWorld * state.view.scale;
  if (spacing < 12) return;
  const startX = ((state.view.offsetX % spacing) + spacing) % spacing;
  const startY = ((state.view.offsetY % spacing) + spacing) % spacing;
  ctx.strokeStyle = 'rgba(80,101,129,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x < width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = startY; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke();
}

function draw() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = els.canvas.clientWidth || 1;
  const height = els.canvas.clientHeight || 1;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (els.canvas.width !== targetW || els.canvas.height !== targetH) {
    els.canvas.width = targetW;
    els.canvas.height = targetH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#090f19';
  ctx.fillRect(0, 0, width, height);
  drawGrid(width, height);

  const component = currentComponent();
  if (!component) {
    els.viewerTitle.textContent = 'ไม่มีข้อมูล';
    els.viewerSubtitle.textContent = 'นำเข้าไฟล์เพื่อแสดงตำแหน่ง Land';
    return;
  }
  els.viewerTitle.textContent = `${component.name} · ${component.packageName || 'Unknown package'}`;
  els.viewerSubtitle.textContent = `${formatInt.format(component.lands.length)} lands · scale ${state.view.scale.toFixed(1)} px/mm`;

  const byGlobal = mappingByGlobalId();
  const current = currentMappings();
  const measurements = current.map((m) => Number(m.measurement)).filter(Number.isFinite);
  const minMeasurement = measurements.length ? Math.min(...measurements) : 0;
  const maxMeasurement = measurements.length ? Math.max(...measurements) : 1;

  if (component.bounds) {
    const p1 = worldToScreen(component.bounds.minX - 1, component.bounds.maxY + 1);
    const p2 = worldToScreen(component.bounds.maxX + 1, component.bounds.minY - 1);
    ctx.strokeStyle = 'rgba(86,214,197,.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
  }

  const showLabels = els.labelToggle.checked && state.view.scale >= 28;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '9px ui-monospace, monospace';
  for (const land of component.lands) {
    const p = worldToScreen(land.centerX, land.centerY);
    if (p.x < -15 || p.x > width + 15 || p.y < -15 || p.y > height + 15) continue;
    const mapping = byGlobal.get(Number(land.globalId));
    const radius = Math.max(1.1, Math.min(8, (land.width || 0.5) * state.view.scale * 0.42));
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = resultColor(mapping, minMeasurement, maxMeasurement);
    ctx.globalAlpha = mapping ? 0.9 : 0.48;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (mapping?.manual) {
      ctx.strokeStyle = '#9d7cff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if (state.selected && Number(state.selected.globalId) === Number(land.globalId)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(5, radius + 4), 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (showLabels && radius > 3) {
      ctx.fillStyle = '#d9e5f5';
      ctx.fillText(land.cadName, p.x, p.y - radius - 2);
    }
  }
}

function findNearestLand(screenX, screenY) {
  const component = currentComponent();
  if (!component) return null;
  const world = screenToWorld(screenX, screenY);
  const threshold = Math.max(0.35, 12 / state.view.scale);
  let best = null;
  let bestD2 = threshold * threshold;
  for (const land of component.lands) {
    const dx = land.centerX - world.x;
    const dy = land.centerY - world.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { best = land; bestD2 = d2; }
  }
  return best;
}

function showTooltip(event, land) {
  if (!land) {
    els.tooltip.classList.add('hidden');
    return;
  }
  const mapping = mappingByGlobalId().get(Number(land.globalId));
  els.tooltip.innerHTML = `<strong>${mapping?.alias || land.cadName}</strong><br>X-ray: ${mapping?.localIndex ?? land.localIndex}<br>XML ID: ${land.globalId}<br>X: ${formatFloat.format(land.centerX)} · Y: ${formatFloat.format(land.centerY)}${mapping ? `<br>Code: ${mapping.resultCode ?? '—'}` : ''}`;
  const rect = els.canvas.getBoundingClientRect();
  els.tooltip.style.left = `${Math.min(rect.width - 175, event.clientX - rect.left + 13)}px`;
  els.tooltip.style.top = `${Math.min(rect.height - 105, event.clientY - rect.top + 13)}px`;
  els.tooltip.classList.remove('hidden');
}

function selectLand(land) {
  if (!land) return;
  const existing = mappingByGlobalId().get(Number(land.globalId));
  if (state.manualMode && state.selected) {
    const mapping = state.selected;
    const occupied = currentMappings().find((item) => item !== mapping && Number(item.globalId) === Number(land.globalId));
    if (occupied && !window.confirm(`ตำแหน่ง ${land.cadName} ถูกจับคู่กับ X-ray Land ${occupied.localIndex} อยู่แล้ว ต้องการใช้ซ้ำหรือไม่?`)) return;
    state.undoStack.push({ mapping, before: { ...mapping } });
    Object.assign(mapping, {
      componentId: land.componentId,
      globalId: land.globalId,
      cadName: land.cadName,
      left: land.left,
      top: land.top,
      centerX: land.centerX,
      centerY: land.centerY,
      width: land.width,
      length: land.length,
      mapped: true,
      manual: true,
      confidence: 100,
    });
    state.manualMode = false;
    els.manualBanner.classList.add('hidden');
    els.manualButton.textContent = 'แก้ Mapping';
    els.undoButton.disabled = false;
    updateDetails();
    renderTable();
    draw();
    toast(`แก้ Mapping Land ${mapping.localIndex} → ${land.cadName}`);
    return;
  }
  if (existing) selectMapping(existing, false);
  else {
    selectMapping({
      sourceRow: null, componentName: currentComponent()?.name, packageName: currentComponent()?.packageName,
      localIndex: land.localIndex, componentId: land.componentId, globalId: land.globalId, cadName: land.cadName,
      left: land.left, top: land.top, centerX: land.centerX, centerY: land.centerY, width: land.width, length: land.length,
      measurement: null, resultCode: null, confidence: 0, mapped: true, manual: false, duplicateCadNameCount: 1, raw: null,
    }, false);
  }
}

function search() {
  const query = els.searchInput.value.trim();
  if (!query) return;
  const mappings = state.mappingData?.mappings || [];
  const number = Number(query);
  let matches = [];
  if (Number.isInteger(number)) {
    matches = currentMappings().filter((m) => Number(m.localIndex) === number);
    if (!matches.length) matches = mappings.filter((m) => Number(m.globalId) === number);
  }
  if (!matches.length) {
    const lower = query.toLowerCase();
    matches = mappings.filter((m) => String(m.cadName).toLowerCase() === lower || String(m.alias || '').toLowerCase() === lower);
  }
  if (!matches.length && state.xmlData) {
    for (const component of state.xmlData.components) {
      for (const land of component.lands) {
        if (String(land.cadName).toLowerCase() === query.toLowerCase() || Number(land.globalId) === number) {
          state.selectedComponentId = component.id;
          els.componentSelect.value = component.id;
          fitView();
          selectLand(land);
          toast('พบใน XML แต่ไม่มีแถว X-ray ที่จับคู่');
          return;
        }
      }
    }
  }
  if (!matches.length) return toast(`ไม่พบ ${query}`);
  selectMapping(matches[0], true);
  if (matches.length > 1) toast(`พบ ${matches.length} ตำแหน่ง เลือกตำแหน่งแรกและแสดงคำเตือนชื่อซ้ำ`);
}

function exportCsv() {
  const mappings = state.mappingData?.mappings || [];
  const headers = ['xray_local_land','xml_global_land_id','cad_name','alias','component','package','center_x_mm','center_y_mm','left_mm','top_mm','width_mm','length_mm','measurement','result_code','confidence','manual','duplicate_cad_name_count','source_row'];
  const lines = [headers.join(',')];
  for (const m of mappings) {
    lines.push([
      m.localIndex,m.globalId,m.cadName,m.alias || '',m.componentName,m.packageName,m.centerX,m.centerY,m.left,m.top,m.width,m.length,
      m.measurement,m.resultCode,m.confidence,m.manual,m.duplicateCadNameCount,m.sourceRow,
    ].map(escapeCsv).join(','));
  }
  const name = `${state.xmlData?.board?.Name || 'bga'}_land_mapping.csv`;
  downloadBlob(new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), name);
}

function exportJson() {
  const payload = {
    app: 'BGA Land Mapper', version: '0.1.0', exportedAt: new Date().toISOString(),
    files: state.fileNames,
    board: state.xmlData?.board,
    schema: state.schema ? {
      componentCol: state.schema.componentCol, packageCol: state.schema.packageCol, landCol: state.schema.landCol,
      measurementCol: state.schema.measurementCol, resultCol: state.schema.resultCol,
    } : null,
    componentSummaries: state.mappingData?.componentSummaries,
    overrides: (state.mappingData?.mappings || []).filter((m) => m.manual || m.alias).map((m) => ({
      sourceRow: m.sourceRow, localIndex: m.localIndex, componentName: m.componentName, globalId: m.globalId, cadName: m.cadName,
      alias: m.alias || '', manual: m.manual,
    })),
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'bga-land-mapper-project.json');
}

function resizeCanvas() {
  draw();
}

els.projectFile.addEventListener('change', (event) => processFile(event.target.files[0]));
els.dropZone.addEventListener('dragover', (event) => { event.preventDefault(); els.dropZone.classList.add('drag'); });
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag'));
els.dropZone.addEventListener('drop', (event) => {
  event.preventDefault(); els.dropZone.classList.remove('drag'); processFile(event.dataTransfer.files[0]);
});
els.resetButton.addEventListener('click', resetProject);
els.remapButton.addEventListener('click', runMapping);
els.componentSelect.addEventListener('change', () => {
  state.selectedComponentId = els.componentSelect.value; state.selected = null; state.page = 1; clearDetails(); updateStats(); renderTable(); fitView();
});
els.heatmapToggle.addEventListener('change', draw);
els.labelToggle.addEventListener('change', draw);
els.fitButton.addEventListener('click', fitView);
els.zoomInButton.addEventListener('click', () => zoomAt(1.3));
els.zoomOutButton.addEventListener('click', () => zoomAt(1 / 1.3));
els.searchButton.addEventListener('click', search);
els.searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') search(); });
els.tableFilter.addEventListener('change', () => { state.filter = els.tableFilter.value; state.page = 1; renderTable(); });
els.prevPage.addEventListener('click', () => { state.page -= 1; renderTable(); });
els.nextPage.addEventListener('click', () => { state.page += 1; renderTable(); });
els.exportCsvButton.addEventListener('click', exportCsv);
els.exportJsonButton.addEventListener('click', exportJson);
els.manualButton.addEventListener('click', () => {
  if (!state.selected) return;
  state.manualMode = !state.manualMode;
  els.manualButton.textContent = state.manualMode ? 'ยกเลิกแก้ Mapping' : 'แก้ Mapping';
  els.manualBanner.classList.toggle('hidden', !state.manualMode);
});
els.undoButton.addEventListener('click', () => {
  const action = state.undoStack.pop();
  if (!action) return;
  Object.keys(action.mapping).forEach((key) => delete action.mapping[key]);
  Object.assign(action.mapping, action.before);
  state.selected = action.mapping;
  els.undoButton.disabled = state.undoStack.length === 0;
  updateDetails(); renderTable(); draw(); toast('ย้อนกลับการแก้ Mapping แล้ว');
});
els.saveAliasButton.addEventListener('click', () => {
  if (!state.selected) return;
  state.selected.alias = els.aliasInput.value.trim();
  updateDetails(); renderTable(); draw(); toast('บันทึกหมายเหตุแล้ว');
});
els.copyRawButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.rawData.textContent); toast('คัดลอกข้อมูลต้นทางแล้ว');
});

els.canvas.addEventListener('wheel', (event) => {
  event.preventDefault(); const p = getCanvasPoint(event); zoomAt(event.deltaY < 0 ? 1.16 : 1 / 1.16, p.x, p.y);
}, { passive: false });
els.canvas.addEventListener('pointerdown', (event) => {
  els.canvas.setPointerCapture(event.pointerId); state.dragging = true; state.lastPointer = getCanvasPoint(event); state.dragStart = { ...state.lastPointer };
});
els.canvas.addEventListener('pointermove', (event) => {
  const p = getCanvasPoint(event);
  if (state.dragging && state.lastPointer) {
    state.view.offsetX += p.x - state.lastPointer.x;
    state.view.offsetY += p.y - state.lastPointer.y;
    state.lastPointer = p; draw(); els.tooltip.classList.add('hidden'); return;
  }
  state.hoveredLand = findNearestLand(p.x, p.y);
  showTooltip(event, state.hoveredLand);
});
els.canvas.addEventListener('pointerup', (event) => {
  const p = getCanvasPoint(event);
  const moved = state.dragStart ? Math.hypot(p.x - state.dragStart.x, p.y - state.dragStart.y) : 0;
  state.dragging = false; state.lastPointer = null; state.dragStart = null;
  if (moved < 4) selectLand(findNearestLand(p.x, p.y));
});
els.canvas.addEventListener('pointercancel', () => { state.dragging = false; state.lastPointer = null; state.dragStart = null; });
els.canvas.addEventListener('pointerleave', () => els.tooltip.classList.add('hidden'));

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); state.installPrompt = event; els.installButton.classList.remove('hidden');
});
els.installButton.addEventListener('click', async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; els.installButton.classList.add('hidden');
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
new ResizeObserver(resizeCanvas).observe(els.canvas);
resetProject();
