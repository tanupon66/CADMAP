import {
  autoDetectSchema,
  buildMappings,
  columnName,
  extractProjectFiles,
  parseInspectionXml,
  parseXlsx,
} from './parsers.js';
import {
  createSequencePreview,
  findLandIndex,
  getAnchorRange,
  restoreMapping,
  snapshotMapping,
  stateForLand,
  stateForUnmapped,
} from './manual-pattern.js';

const $ = (id) => document.getElementById(id);
const els = {
  projectFile: $('projectFile'), dropZone: $('dropZone'), resetButton: $('resetButton'),
  restoreButton: $('restoreButton'), restoreFile: $('restoreFile'),
  xmlFileName: $('xmlFileName'), xlsxFileName: $('xlsxFileName'), importMessage: $('importMessage'),
  progressWrap: $('progressWrap'), projectStatus: $('projectStatus'),
  componentColumn: $('componentColumn'), packageColumn: $('packageColumn'), landColumn: $('landColumn'),
  measurementColumn: $('measurementColumn'), remapButton: $('remapButton'),
  mappedStat: $('mappedStat'), unmappedStat: $('unmappedStat'), xmlLandStat: $('xmlLandStat'), componentStat: $('componentStat'),
  mappingFormula: $('mappingFormula'), componentSelect: $('componentSelect'), heatmapToggle: $('heatmapToggle'), labelToggle: $('labelToggle'),
  fitButton: $('fitButton'), zoomInButton: $('zoomInButton'), zoomOutButton: $('zoomOutButton'),
  searchInput: $('searchInput'), searchButton: $('searchButton'), manualButton: $('manualButton'), teachButton: $('teachButton'),
  undoButton: $('undoButton'), redoButton: $('redoButton'), exportCsvButton: $('exportCsvButton'), exportJsonButton: $('exportJsonButton'),
  canvas: $('cadCanvas'), viewerTitle: $('viewerTitle'), viewerSubtitle: $('viewerSubtitle'), tooltip: $('tooltip'), manualBanner: $('manualBanner'),
  tableFilter: $('tableFilter'), mappingTableBody: $('mappingTableBody'), tableSummary: $('tableSummary'), prevPage: $('prevPage'), nextPage: $('nextPage'), pageLabel: $('pageLabel'),
  selectedTitle: $('selectedTitle'), selectedSubTitle: $('selectedSubTitle'), dLocal: $('dLocal'), dGlobal: $('dGlobal'), dCad: $('dCad'), dComponent: $('dComponent'),
  dX: $('dX'), dY: $('dY'), dMeasurement: $('dMeasurement'), dConfidence: $('dConfidence'), dRow: $('dRow'), dMethod: $('dMethod'), dAnchor: $('dAnchor'),
  measurementHistogram: $('measurementHistogram'), histogramBins: $('histogramBins'), histogramMessage: $('histogramMessage'),
  histCount: $('histCount'), histMin: $('histMin'), histAverage: $('histAverage'), histMedian: $('histMedian'), histMax: $('histMax'),
  anchorButton: $('anchorButton'), unmapButton: $('unmapButton'), nudgePrevButton: $('nudgePrevButton'), nudgeNextButton: $('nudgeNextButton'),
  aliasInput: $('aliasInput'), saveAliasButton: $('saveAliasButton'), duplicateWarning: $('duplicateWarning'), rawData: $('rawData'), copyRawButton: $('copyRawButton'),
  teachOverlay: $('teachOverlay'), closeTeachButton: $('closeTeachButton'), teachComponentLabel: $('teachComponentLabel'),
  anchorCountLabel: $('anchorCountLabel'), anchorList: $('anchorList'), clearAnchorsButton: $('clearAnchorsButton'),
  patternDirection: $('patternDirection'), patternShift: $('patternShift'), patternStart: $('patternStart'), patternEnd: $('patternEnd'), preserveAnchors: $('preserveAnchors'),
  previewPatternButton: $('previewPatternButton'), fillBetweenButton: $('fillBetweenButton'), clearPreviewButton: $('clearPreviewButton'),
  previewTitle: $('previewTitle'), previewDirectionBadge: $('previewDirectionBadge'), previewApplicable: $('previewApplicable'), previewHigh: $('previewHigh'), previewReview: $('previewReview'), previewConflict: $('previewConflict'),
  previewFormula: $('previewFormula'), previewWarning: $('previewWarning'), applyPatternButton: $('applyPatternButton'), applyHighButton: $('applyHighButton'),
  previewForwardButton: $('previewForwardButton'), previewReverseButton: $('previewReverseButton'), shiftAllPrevButton: $('shiftAllPrevButton'), shiftAllNextButton: $('shiftAllNextButton'), unmapRangeButton: $('unmapRangeButton'),
  toast: $('toast'), installButton: $('installButton'),
};

const state = {
  xmlText: null, xlsxBuffer: null, xmlData: null, xlsxData: null, schema: null, mappingData: null,
  selectedComponentId: null, selected: null, hoveredLand: null, manualMode: false, preview: null,
  undoStack: [], redoStack: [], page: 1, pageSize: 80, filter: 'all',
  view: { scale: 1, offsetX: 0, offsetY: 0 }, dragging: false, lastPointer: null, dragStart: null,
  fileNames: { xml: '', xlsx: '' }, installPrompt: null,
};

const ctx = els.canvas.getContext('2d', { alpha: false });
const histogramCtx = els.measurementHistogram.getContext('2d');
const formatInt = new Intl.NumberFormat('th-TH');
const formatFloat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 });

function toast(message, timeout = 2800) {
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
function nextFrame() { return new Promise((resolve) => requestAnimationFrame(resolve)); }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function currentComponent() { return state.xmlData?.componentById.get(String(state.selectedComponentId)) || null; }
function currentMappings() {
  if (!state.mappingData) return [];
  return state.mappingData.mappings.filter((mapping) => String(mapping.componentId) === String(state.selectedComponentId));
}
function mappingByGlobalId() {
  const map = new Map();
  for (const mapping of currentMappings()) if (mapping.globalId != null) map.set(Number(mapping.globalId), mapping);
  return map;
}
function duplicateCountForLand(land) {
  const component = state.xmlData?.componentById.get(String(land?.componentId));
  if (!component || !land?.cadName) return 1;
  return component.lands.filter((item) => item.cadName === land.cadName).length || 1;
}
function normalizeMappings() {
  for (const mapping of state.mappingData?.mappings || []) {
    if (mapping.anchorLocked == null) mapping.anchorLocked = false;
    if (!mapping.mappingMethod) mapping.mappingMethod = mapping.mapped ? 'auto-sequence' : 'unmapped';
    if (mapping.alias == null) mapping.alias = '';
  }
  recomputeStats();
}
function recomputeStats() {
  if (!state.mappingData) return;
  const mappings = state.mappingData.mappings;
  state.mappingData.stats = {
    total: mappings.length,
    mapped: mappings.filter((m) => m.mapped).length,
    unmapped: mappings.filter((m) => !m.mapped).length,
    duplicateCadNames: mappings.filter((m) => m.duplicateCadNameCount > 1).length,
    manual: mappings.filter((m) => m.manual).length,
    anchors: mappings.filter((m) => m.anchorLocked).length,
  };
}
function refreshHistoryButtons() {
  els.undoButton.disabled = state.undoStack.length === 0;
  els.redoButton.disabled = state.redoStack.length === 0;
  els.undoButton.title = state.undoStack.length ? state.undoStack[state.undoStack.length - 1].label : '';
  els.redoButton.title = state.redoStack.length ? state.redoStack[state.redoStack.length - 1].label : '';
}
function snapshotsEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function applyTransaction(label, changes, record = true) {
  const useful = changes.filter(({ before, after }) => !snapshotsEqual(before, after));
  if (!useful.length) return false;
  for (const change of useful) restoreMapping(change.mapping, change.after);
  if (record) {
    state.undoStack.push({ label, changes: useful });
    if (state.undoStack.length > 24) state.undoStack.shift();
    state.redoStack = [];
  }
  state.preview = null;
  refreshAfterEdit();
  return true;
}
function undo() {
  const action = state.undoStack.pop(); if (!action) return;
  for (const change of action.changes) restoreMapping(change.mapping, change.before);
  state.redoStack.push(action); state.preview = null; refreshAfterEdit(); toast(`Undo: ${action.label}`);
}
function redo() {
  const action = state.redoStack.pop(); if (!action) return;
  for (const change of action.changes) restoreMapping(change.mapping, change.after);
  state.undoStack.push(action); state.preview = null; refreshAfterEdit(); toast(`Redo: ${action.label}`);
}
function refreshAfterEdit() {
  if (!state.preview && !state.manualMode) {
    els.manualBanner.classList.add('hidden');
    els.manualBanner.classList.remove('preview-active');
  }
  recomputeStats(); updateStats(); updateDetails(); renderTable(); renderTeachPanel(); draw(); renderHistogram(); refreshHistoryButtons();
}

function columnOptionLabel(descriptor) {
  const header = descriptor.header ? String(descriptor.header) : 'ไม่มีหัวคอลัมน์';
  const sample = descriptor.sample !== '' ? `ตัวอย่าง ${String(descriptor.sample).slice(0, 28)}` : 'ไม่มีข้อมูล';
  return `${columnName(descriptor.col)} · ${header} · ${sample}`;
}
function fillColumnSelect(select, descriptors, selected, optional = false) {
  select.innerHTML = '';
  if (optional) { const none = document.createElement('option'); none.value = ''; none.textContent = '— ไม่ใช้คอลัมน์นี้ —'; select.append(none); }
  for (const descriptor of descriptors) {
    const option = document.createElement('option'); option.value = String(descriptor.col); option.textContent = columnOptionLabel(descriptor); option.selected = descriptor.col === selected; select.append(option);
  }
}
function readSchemaControls() {
  const optional = (select) => select.value === '' ? null : Number(select.value);
  return { ...state.schema, componentCol: Number(els.componentColumn.value), packageCol: Number(els.packageColumn.value), landCol: Number(els.landColumn.value), measurementCol: optional(els.measurementColumn) };
}
function populateSchemaControls() {
  if (!state.schema) return;
  const d = state.schema.descriptors;
  fillColumnSelect(els.componentColumn, d, state.schema.componentCol);
  fillColumnSelect(els.packageColumn, d, state.schema.packageCol);
  fillColumnSelect(els.landColumn, d, state.schema.landCol);
  fillColumnSelect(els.measurementColumn, d, state.schema.measurementCol, true);
}
function populateComponents(preferredId = null) {
  els.componentSelect.innerHTML = '';
  const summaries = state.mappingData?.componentSummaries || [];
  if (!summaries.length) { state.selectedComponentId = null; return; }

  const seen = new Set();
  const matched = [];
  for (const summary of summaries) {
    if (summary.componentId == null || seen.has(String(summary.componentId))) continue;
    seen.add(String(summary.componentId));
    matched.push(summary);
    const option = document.createElement('option');
    option.value = String(summary.componentId);
    option.textContent = `${summary.componentName || `ID ${summary.componentId}`} · Raw ${formatInt.format(summary.xrayCount)} / CAD ${formatInt.format(summary.xmlCount)} lands · ${summary.packageName || summary.cadPackageName || 'ไม่ทราบ package'}`;
    els.componentSelect.append(option);
  }
  for (const summary of summaries.filter((item) => item.componentId == null)) {
    const option = document.createElement('option');
    option.disabled = true;
    option.textContent = `${summary.componentName || 'ไม่ทราบชื่อ'} · ไม่พบ Part นี้ใน CAD · Raw ${formatInt.format(summary.xrayCount)} lands`;
    els.componentSelect.append(option);
  }

  const allowedIds = new Set(matched.map((summary) => String(summary.componentId)));
  const countMatchFirst = matched.find((summary) => summary.countMatch)?.componentId;
  const chosenCandidate = preferredId ?? countMatchFirst ?? matched[0]?.componentId ?? null;
  const chosen = chosenCandidate != null && allowedIds.has(String(chosenCandidate)) ? String(chosenCandidate) : (matched[0] ? String(matched[0].componentId) : null);
  state.selectedComponentId = chosen;
  if (chosen != null) els.componentSelect.value = chosen;
}
function updateStats() {
  const stats = state.mappingData?.stats;
  els.mappedStat.textContent = formatInt.format(stats?.mapped || 0);
  els.unmappedStat.textContent = formatInt.format(stats?.unmapped || 0);
  const summaries = state.mappingData?.componentSummaries || [];
  const shownComponentIds = [...new Set(summaries.filter((item) => item.componentId != null).map((item) => String(item.componentId)))];
  const shownCadLands = shownComponentIds.reduce((sum, id) => sum + (state.xmlData?.componentById.get(id)?.lands.length || 0), 0);
  els.xmlLandStat.textContent = formatInt.format(shownCadLands);
  els.componentStat.textContent = formatInt.format(summaries.length);
  const summary = state.mappingData?.componentSummaries.find((item) => String(item.componentId) === String(state.selectedComponentId)) || state.mappingData?.componentSummaries[0];
  const anchors = currentMappings().filter((mapping) => mapping.anchorLocked).length;
  if (summary?.countMatch) {
    els.mappingFormula.innerHTML = summary.contiguous
      ? `Component ${summary.componentName}: XML ID = X-ray Land + ${formatInt.format(summary.offset)}<br>Manual anchors ปัจจุบัน ${formatInt.format(anchors)} จุด`
      : `Component ${summary.componentName}: ใช้ลำดับ XML global ID · Manual anchors ${formatInt.format(anchors)} จุด`;
  } else if (summary) els.mappingFormula.textContent = `จำนวนไม่ตรงกัน: X-ray ${summary.xrayCount} / XML ${summary.xmlCount} · ควรใช้ Manual Teach ตรวจสอบ`;
  else els.mappingFormula.textContent = 'ยังไม่มีสูตร Mapping';
  const ready = Boolean(state.xmlData && state.xlsxData && state.mappingData);
  els.projectStatus.textContent = ready ? `พร้อม · ${formatInt.format(stats.mapped)} mapped · ${formatInt.format(stats.anchors || 0)} anchors` : state.xmlData ? 'เปิด XML แล้ว' : 'ยังไม่ได้เปิดโปรเจกต์';
  els.projectStatus.className = `status-pill ${ready ? 'ready' : 'muted'}`;
  els.remapButton.disabled = !state.xmlData || !state.xlsxData;
  els.exportCsvButton.disabled = !ready; els.exportJsonButton.disabled = !ready; els.restoreButton.disabled = !ready; els.teachButton.disabled = !ready;
  els.manualButton.disabled = !state.selected; refreshHistoryButtons();
}
function runMapping() {
  if (!state.xmlData || !state.xlsxData) return;
  const hasManual = state.mappingData?.mappings.some((m) => m.manual || m.anchorLocked);
  if (hasManual && !window.confirm('คำนวณ Mapping ใหม่จะล้าง Manual mapping และ Anchor ทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) return;
  state.schema = readSchemaControls(); state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema); normalizeMappings();
  state.undoStack = []; state.redoStack = []; state.preview = null;
  const firstMapped = state.mappingData.mappings.find((mapping) => mapping.mapped);
  populateComponents(firstMapped?.componentId || state.selectedComponentId); state.page = 1;
  updateStats(); renderTable(); renderTeachPanel(); fitView(); draw(); renderHistogram();
  toast(`จับคู่สำเร็จ ${formatInt.format(state.mappingData.stats.mapped)} จาก ${formatInt.format(state.mappingData.stats.total)} รายการ`);
}
async function processFile(file) {
  if (!file) return; setLoading(true, `กำลังเปิด ${file.name}…`); await nextFrame();
  try {
    const project = await extractProjectFiles(file);
    if (project.xmlText) { state.xmlText = project.xmlText; state.fileNames.xml = project.names.xml || file.name; els.importMessage.textContent = 'กำลังอ่าน Component และ Land จาก XML…'; await nextFrame(); state.xmlData = parseInspectionXml(project.xmlText); }
    if (project.xlsxBuffer) { state.xlsxBuffer = project.xlsxBuffer; state.fileNames.xlsx = project.names.xlsx || file.name; els.importMessage.textContent = 'กำลังอ่านตารางผล X-ray จาก XLSX…'; await nextFrame(); state.xlsxData = await parseXlsx(project.xlsxBuffer); }
    els.xmlFileName.textContent = state.fileNames.xml || '—'; els.xlsxFileName.textContent = state.fileNames.xlsx || '—';
    if (state.xmlData) populateComponents(state.selectedComponentId);
    if (state.xmlData && state.xlsxData) {
      els.importMessage.textContent = 'กำลังตรวจหาคอลัมน์และสร้าง Mapping…'; await nextFrame();
      state.schema = autoDetectSchema(state.xlsxData.activeSheet.rows, state.xmlData); populateSchemaControls();
      state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema); normalizeMappings(); state.undoStack = []; state.redoStack = []; state.preview = null;
      const firstMapped = state.mappingData.mappings.find((mapping) => mapping.mapped); populateComponents(firstMapped?.componentId); renderTable();
      const summaries = state.mappingData.componentSummaries;
      const matchedParts = summaries.filter((summary) => summary.matched).length;
      const exactParts = summaries.filter((summary) => summary.countMatch).length;
      const missingParts = summaries.length - matchedParts;
      els.importMessage.textContent = `พบข้อมูลดิบ ${formatInt.format(summaries.length)} Part · จับคู่กับ CAD ได้ ${formatInt.format(matchedParts)} Part · จำนวน Land ตรงกัน ${formatInt.format(exactParts)} Part${missingParts ? ` · ไม่พบใน CAD ${formatInt.format(missingParts)} Part` : ''}`;
    } else els.importMessage.textContent = state.xmlData ? 'เปิด XML แล้ว กรุณาเลือก XLSX เพิ่ม' : 'เปิด XLSX แล้ว กรุณาเลือก XML เพิ่ม';
    updateStats(); renderTeachPanel(); fitView(); draw(); renderHistogram();
  } catch (error) { console.error(error); els.importMessage.textContent = `เกิดข้อผิดพลาด: ${error.message}`; toast(error.message, 5200); }
  finally { setLoading(false); els.projectFile.value = ''; }
}
function resetProject() {
  Object.assign(state, { xmlText: null, xlsxBuffer: null, xmlData: null, xlsxData: null, schema: null, mappingData: null, selectedComponentId: null, selected: null, hoveredLand: null, manualMode: false, preview: null, undoStack: [], redoStack: [], page: 1, fileNames: { xml: '', xlsx: '' }, view: { scale: 1, offsetX: 0, offsetY: 0 }, dragStart: null });
  els.xmlFileName.textContent = '—'; els.xlsxFileName.textContent = '—'; els.importMessage.textContent = 'ไฟล์จะถูกประมวลผลในเครื่อง ไม่อัปโหลดไปยังเซิร์ฟเวอร์';
  for (const select of [els.componentColumn, els.packageColumn, els.landColumn, els.measurementColumn, els.componentSelect]) select.innerHTML = '';
  els.mappingTableBody.innerHTML = ''; els.teachOverlay.classList.add('hidden'); clearDetails(); renderTeachPanel(); updateStats(); draw(); renderHistogram();
}
function filteredMappings() {
  const mappings = currentMappings();
  switch (state.filter) {
    case 'duplicate': return mappings.filter((m) => m.duplicateCadNameCount > 1);
    case 'manual': return mappings.filter((m) => m.manual || m.anchorLocked);
    case 'unmapped': return mappings.filter((m) => !m.mapped);
    default: return mappings;
  }
}
function mappingStatus(mapping) {
  if (!mapping.mapped) return { text: 'Unmapped', cls: 'unmapped' };
  if (mapping.anchorLocked) return { text: 'Anchor', cls: 'anchor' };
  if (mapping.manual) return { text: 'Manual', cls: 'manual' };
  return { text: 'Auto', cls: 'auto' };
}
function renderTable() {
  const all = filteredMappings(); const pages = Math.max(1, Math.ceil(all.length / state.pageSize)); state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * state.pageSize; const rows = all.slice(start, start + state.pageSize);
  const previewMappings = new Set(state.preview?.proposals.map((p) => p.mapping) || []); els.mappingTableBody.innerHTML = ''; const fragment = document.createDocumentFragment();
  for (const mapping of rows) {
    const tr = document.createElement('tr'); if (state.selected === mapping) tr.classList.add('active'); if (mapping.anchorLocked) tr.classList.add('anchor-row'); if (previewMappings.has(mapping)) tr.classList.add('preview-row');
    const values = [mapping.localIndex, mapping.globalId, mapping.alias || mapping.cadName || 'Unmapped', Number.isFinite(mapping.centerX) ? formatFloat.format(mapping.centerX) : '—', Number.isFinite(mapping.centerY) ? formatFloat.format(mapping.centerY) : '—', mapping.measurement ?? '—', `${mapping.confidence ?? 0}%`];
    for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
    const status = mappingStatus(mapping); const statusTd = document.createElement('td'); const chip = document.createElement('span'); chip.className = `status-chip ${status.cls}`; chip.textContent = status.text; statusTd.append(chip); tr.append(statusTd);
    tr.addEventListener('click', () => selectMapping(mapping, true)); fragment.append(tr);
  }
  els.mappingTableBody.append(fragment); els.tableSummary.textContent = `${formatInt.format(all.length)} รายการ`; els.pageLabel.textContent = `${state.page} / ${pages}`; els.prevPage.disabled = state.page <= 1; els.nextPage.disabled = state.page >= pages;
}
function selectMapping(mapping, center = false) {
  state.selected = mapping; state.manualMode = false; els.manualBanner.classList.add('hidden'); els.manualBanner.classList.remove('preview-active'); els.manualButton.textContent = 'เลือก CAD ใหม่';
  if (mapping.componentId != null && String(mapping.componentId) !== String(state.selectedComponentId)) { state.selectedComponentId = String(mapping.componentId); els.componentSelect.value = String(mapping.componentId); fitView(); }
  updateDetails(); renderTable(); if (center && Number.isFinite(mapping.centerX) && Number.isFinite(mapping.centerY)) centerOn(mapping.centerX, mapping.centerY); draw(); renderHistogram();
}
function clearDetails() {
  state.selected = null; els.selectedTitle.textContent = 'ยังไม่ได้เลือก'; els.selectedSubTitle.textContent = 'ค้นหาหรือคลิกตำแหน่งบนกราฟิก';
  for (const el of [els.dLocal, els.dGlobal, els.dCad, els.dComponent, els.dX, els.dY, els.dMeasurement, els.dConfidence, els.dRow, els.dMethod, els.dAnchor]) el.textContent = '—';
  els.rawData.textContent = '—'; els.aliasInput.value = ''; els.aliasInput.disabled = true; els.saveAliasButton.disabled = true; els.copyRawButton.disabled = true; els.duplicateWarning.classList.add('hidden');
  for (const button of [els.manualButton, els.anchorButton, els.unmapButton, els.nudgePrevButton, els.nudgeNextButton]) button.disabled = true;
}
function updateDetails() {
  const mapping = state.selected; if (!mapping) return clearDetails();
  els.selectedTitle.textContent = mapping.alias || mapping.cadName || `Land ${mapping.localIndex}`; els.selectedSubTitle.textContent = `${mapping.componentName || 'Unknown component'} · ${mapping.packageName || 'Unknown package'}`;
  els.dLocal.textContent = mapping.localIndex ?? '—'; els.dGlobal.textContent = mapping.globalId ?? '—'; els.dCad.textContent = mapping.cadName || '—'; els.dComponent.textContent = mapping.componentName || '—';
  els.dX.textContent = Number.isFinite(mapping.centerX) ? `${formatFloat.format(mapping.centerX)} mm` : '—'; els.dY.textContent = Number.isFinite(mapping.centerY) ? `${formatFloat.format(mapping.centerY)} mm` : '—';
  els.dMeasurement.textContent = mapping.measurement ?? '—'; els.dConfidence.textContent = `${mapping.confidence ?? 0}%${mapping.manual ? ' · manual' : ''}`; els.dRow.textContent = mapping.sourceRow ?? '—';
  els.dMethod.textContent = mapping.mappingMethod || (mapping.manual ? 'manual' : 'auto'); els.dAnchor.textContent = mapping.anchorLocked ? 'ล็อกแล้ว' : 'ไม่ล็อก';
  els.aliasInput.disabled = false; els.saveAliasButton.disabled = false; els.copyRawButton.disabled = !mapping.raw; els.aliasInput.value = mapping.alias || '';
  els.rawData.textContent = mapping.raw ? mapping.raw.map((value, index) => `${columnName(index)}: ${value ?? ''}`).join('\n') : JSON.stringify(mapping, null, 2);
  if (mapping.duplicateCadNameCount > 1) { els.duplicateWarning.textContent = `ชื่อ CAD ${mapping.cadName} พบซ้ำ ${mapping.duplicateCadNameCount} ตำแหน่ง จึงต้องอ้างอิง X-ray Land, XML ID และพิกัดร่วมกัน`; els.duplicateWarning.classList.remove('hidden'); }
  else els.duplicateWarning.classList.add('hidden');
  els.manualButton.disabled = false; els.anchorButton.disabled = !mapping.mapped; els.anchorButton.textContent = mapping.anchorLocked ? 'ปลด Anchor' : 'ล็อกเป็น Anchor'; els.unmapButton.disabled = !mapping.mapped; els.nudgePrevButton.disabled = !mapping.mapped; els.nudgeNextButton.disabled = !mapping.mapped;
  document.querySelector('.right-panel')?.classList.add('open');
}
function getCanvasPoint(event) { const rect = els.canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
function worldToScreen(x, y) { return { x: x * state.view.scale + state.view.offsetX, y: -y * state.view.scale + state.view.offsetY }; }
function screenToWorld(x, y) { return { x: (x - state.view.offsetX) / state.view.scale, y: (state.view.offsetY - y) / state.view.scale }; }
function fitView() {
  const component = currentComponent(); if (!component?.bounds || !els.canvas.clientWidth || !els.canvas.clientHeight) return;
  const { minX, maxX, minY, maxY } = component.bounds; const pad = 24; const width = Math.max(1, maxX - minX + 3); const height = Math.max(1, maxY - minY + 3);
  const scale = Math.max(0.1, Math.min((els.canvas.clientWidth - pad * 2) / width, (els.canvas.clientHeight - pad * 2) / height));
  state.view.scale = scale; state.view.offsetX = els.canvas.clientWidth / 2 - ((minX + maxX) / 2) * scale; state.view.offsetY = els.canvas.clientHeight / 2 + ((minY + maxY) / 2) * scale; draw();
}
function centerOn(x, y) { state.view.offsetX = els.canvas.clientWidth / 2 - x * state.view.scale; state.view.offsetY = els.canvas.clientHeight / 2 + y * state.view.scale; draw(); }
function zoomAt(factor, screenX = els.canvas.clientWidth / 2, screenY = els.canvas.clientHeight / 2) {
  const world = screenToWorld(screenX, screenY); const newScale = Math.min(450, Math.max(0.25, state.view.scale * factor)); state.view.scale = newScale; state.view.offsetX = screenX - world.x * newScale; state.view.offsetY = screenY + world.y * newScale; draw();
}
function renderHistogram() {
  const canvas = els.measurementHistogram;
  const hctx = histogramCtx;
  if (!canvas || !hctx) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = canvas.clientWidth || 260;
  const height = canvas.clientHeight || 170;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hctx.clearRect(0, 0, width, height);
  hctx.fillStyle = '#0b1320';
  hctx.fillRect(0, 0, width, height);

  const values = currentMappings().map((mapping) => Number(mapping.measurement)).filter(Number.isFinite).sort((a, b) => a - b);
  const component = currentComponent();
  els.histCount.textContent = formatInt.format(values.length);
  if (!values.length) {
    for (const el of [els.histMin, els.histAverage, els.histMedian, els.histMax]) el.textContent = '—';
    els.histogramMessage.textContent = component ? `${component.name}: ไม่พบ Measurement ที่เป็นตัวเลขในข้อมูลดิบ` : 'เลือก Part ที่พบในข้อมูลดิบเพื่อแสดง Histogram';
    hctx.fillStyle = '#91a0b7'; hctx.font = '11px system-ui'; hctx.textAlign = 'center'; hctx.textBaseline = 'middle'; hctx.fillText('No numeric measurement data', width / 2, height / 2);
    return;
  }

  const min = values[0];
  const max = values[values.length - 1];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  const display = (value) => formatFloat.format(value);
  els.histMin.textContent = display(min); els.histAverage.textContent = display(average); els.histMedian.textContent = display(median); els.histMax.textContent = display(max);

  const requestedBins = Math.max(5, Math.min(80, Number(els.histogramBins.value) || 20));
  const binCount = max === min ? 1 : requestedBins;
  const span = max - min || 1;
  const counts = Array(binCount).fill(0);
  for (const value of values) {
    const index = max === min ? 0 : Math.min(binCount - 1, Math.floor(((value - min) / span) * binCount));
    counts[index] += 1;
  }
  const peak = Math.max(...counts, 1);
  const margin = { left: 36, right: 10, top: 12, bottom: 25 };
  const chartW = Math.max(1, width - margin.left - margin.right);
  const chartH = Math.max(1, height - margin.top - margin.bottom);

  hctx.strokeStyle = 'rgba(145,160,183,.16)'; hctx.lineWidth = 1;
  for (let step = 0; step <= 2; step += 1) {
    const y = margin.top + chartH * (step / 2);
    hctx.beginPath(); hctx.moveTo(margin.left, y); hctx.lineTo(width - margin.right, y); hctx.stroke();
  }
  const slot = chartW / binCount;
  const gap = Math.min(2, slot * 0.18);
  counts.forEach((count, index) => {
    const barH = (count / peak) * chartH;
    const ratio = binCount === 1 ? 0.5 : index / (binCount - 1);
    hctx.fillStyle = `hsl(${210 - ratio * 190} 78% 58%)`;
    hctx.fillRect(margin.left + index * slot + gap / 2, margin.top + chartH - barH, Math.max(1, slot - gap), barH);
  });

  hctx.fillStyle = '#91a0b7'; hctx.font = '9px system-ui'; hctx.textBaseline = 'top';
  hctx.textAlign = 'left'; hctx.fillText(display(min), margin.left, height - margin.bottom + 6);
  hctx.textAlign = 'right'; hctx.fillText(display(max), width - margin.right, height - margin.bottom + 6);
  hctx.textBaseline = 'middle'; hctx.fillText(formatInt.format(peak), margin.left - 5, margin.top + 2);
  hctx.fillText('0', margin.left - 5, margin.top + chartH);

  const selectedMeasurement = Number(state.selected?.measurement);
  if (Number.isFinite(selectedMeasurement) && String(state.selected?.componentId) === String(state.selectedComponentId)) {
    const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (selectedMeasurement - min) / span));
    const x = margin.left + ratio * chartW;
    hctx.strokeStyle = '#ffffff'; hctx.lineWidth = 1.5; hctx.beginPath(); hctx.moveTo(x, margin.top); hctx.lineTo(x, margin.top + chartH); hctx.stroke();
    hctx.fillStyle = '#ffffff'; hctx.textAlign = x > width * 0.72 ? 'right' : 'left'; hctx.textBaseline = 'top'; hctx.fillText(display(selectedMeasurement), x + (x > width * 0.72 ? -4 : 4), margin.top + 2);
  }

  const binWidth = binCount === 1 ? 0 : span / binCount;
  els.histogramMessage.textContent = `${component?.name || 'Part'} · ${formatInt.format(values.length)} ค่า · ${binCount} bins${binWidth ? ` · bin width ${display(binWidth)}` : ''}`;
}
function measurementColor(mapping, minMeasurement, maxMeasurement) {
  if (!mapping) return '#506078';
  if (els.heatmapToggle.checked && Number.isFinite(Number(mapping.measurement))) {
    const ratio = maxMeasurement > minMeasurement ? (Number(mapping.measurement) - minMeasurement) / (maxMeasurement - minMeasurement) : 0.5;
    return `hsl(${210 - Math.max(0, Math.min(1, ratio)) * 190} 78% 58%)`;
  }
  return '#62a9e8';
}
function drawGrid(width, height) {
  const spacingWorld = state.view.scale < 5 ? 20 : state.view.scale < 15 ? 10 : state.view.scale < 45 ? 5 : 1; const spacing = spacingWorld * state.view.scale; if (spacing < 12) return;
  const startX = ((state.view.offsetX % spacing) + spacing) % spacing; const startY = ((state.view.offsetY % spacing) + spacing) % spacing; ctx.strokeStyle = 'rgba(80,101,129,.12)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = startX; x < width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); } for (let y = startY; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); } ctx.stroke();
}
function previewStatusByGlobalId() { const map = new Map(); for (const [globalId, proposal] of state.preview?.lookup || []) map.set(globalId, proposal.status); return map; }
function draw() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); const width = els.canvas.clientWidth || 1; const height = els.canvas.clientHeight || 1; const targetW = Math.round(width * dpr); const targetH = Math.round(height * dpr);
  if (els.canvas.width !== targetW || els.canvas.height !== targetH) { els.canvas.width = targetW; els.canvas.height = targetH; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#090f19'; ctx.fillRect(0, 0, width, height); drawGrid(width, height);
  const component = currentComponent();
  if (!component) { els.viewerTitle.textContent = 'ไม่มีข้อมูล'; els.viewerSubtitle.textContent = 'นำเข้าไฟล์เพื่อแสดงตำแหน่ง Land'; return; }
  els.viewerTitle.textContent = `${component.name} · ${component.packageName || 'Unknown package'}`; els.viewerSubtitle.textContent = `${formatInt.format(component.lands.length)} lands · scale ${state.view.scale.toFixed(1)} px/mm${state.preview ? ' · Preview active' : ''}`;
  const byGlobal = mappingByGlobalId(); const previewByGlobal = previewStatusByGlobalId(); const current = currentMappings(); const measurements = current.map((m) => Number(m.measurement)).filter(Number.isFinite); const minMeasurement = measurements.length ? Math.min(...measurements) : 0; const maxMeasurement = measurements.length ? Math.max(...measurements) : 1;
  if (component.bounds) { const p1 = worldToScreen(component.bounds.minX - 1, component.bounds.maxY + 1); const p2 = worldToScreen(component.bounds.maxX + 1, component.bounds.minY - 1); ctx.strokeStyle = 'rgba(86,214,197,.28)'; ctx.lineWidth = 1; ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y); }
  const showLabels = els.labelToggle.checked && state.view.scale >= 28; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '9px ui-monospace, monospace';
  for (const land of component.lands) {
    const p = worldToScreen(land.centerX, land.centerY); if (p.x < -15 || p.x > width + 15 || p.y < -15 || p.y > height + 15) continue;
    const mapping = byGlobal.get(Number(land.globalId)); const previewStatus = previewByGlobal.get(Number(land.globalId)); const radius = Math.max(1.1, Math.min(8, (land.width || 0.5) * state.view.scale * 0.42));
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = measurementColor(mapping, minMeasurement, maxMeasurement); ctx.globalAlpha = mapping ? 0.9 : 0.48; ctx.fill(); ctx.globalAlpha = 1;
    if (previewStatus) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.5, radius + 1.5), 0, Math.PI * 2); ctx.strokeStyle = ['conflict', 'anchor-conflict', 'out-of-range'].includes(previewStatus) ? '#ff6b75' : '#2ba7ff'; ctx.globalAlpha = 0.72; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
    if (mapping?.anchorLocked) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3.5, radius + 2.5), 0, Math.PI * 2); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.8; ctx.stroke(); }
    else if (mapping?.manual) { ctx.strokeStyle = '#9d7cff'; ctx.lineWidth = 1.3; ctx.stroke(); }
    if (state.selected && Number(state.selected.globalId) === Number(land.globalId)) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(5, radius + 4), 0, Math.PI * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); }
    if (showLabels && radius > 3) { ctx.fillStyle = '#d9e5f5'; ctx.fillText(land.cadName, p.x, p.y - radius - 2); }
  }
}
function findNearestLand(screenX, screenY) {
  const component = currentComponent(); if (!component) return null; const world = screenToWorld(screenX, screenY); const threshold = Math.max(0.35, 12 / state.view.scale); let best = null; let bestD2 = threshold * threshold;
  for (const land of component.lands) { const dx = land.centerX - world.x; const dy = land.centerY - world.y; const d2 = dx * dx + dy * dy; if (d2 < bestD2) { best = land; bestD2 = d2; } }
  return best;
}
function showTooltip(event, land) {
  if (!land) { els.tooltip.classList.add('hidden'); return; }
  const mapping = mappingByGlobalId().get(Number(land.globalId)); const preview = state.preview?.lookup?.get(Number(land.globalId));
  els.tooltip.innerHTML = `<strong>${mapping?.alias || land.cadName}</strong><br>X-ray: ${mapping?.localIndex ?? '—'}<br>XML ID: ${land.globalId}<br>X: ${formatFloat.format(land.centerX)} · Y: ${formatFloat.format(land.centerY)}${mapping ? `<br>Measurement: ${mapping.measurement ?? '—'}` : ''}${preview ? `<br>Preview: X-ray ${preview.localIndex} · ${preview.status}` : ''}`;
  const rect = els.canvas.getBoundingClientRect(); els.tooltip.style.left = `${Math.min(rect.width - 190, event.clientX - rect.left + 13)}px`; els.tooltip.style.top = `${Math.min(rect.height - 125, event.clientY - rect.top + 13)}px`; els.tooltip.classList.remove('hidden');
}
function directRemap(mapping, land, label = 'Manual remap') {
  const component = currentComponent(); if (!component || !mapping || !land) return;
  const occupied = currentMappings().find((item) => item !== mapping && item.mapped && Number(item.globalId) === Number(land.globalId));
  const oldLand = mapping.mapped ? component.lands.find((item) => Number(item.globalId) === Number(mapping.globalId)) : null; const changes = [];
  if (occupied) {
    const swapText = oldLand ? `สลับกับ X-ray Land ${occupied.localIndex}` : `Unmap X-ray Land ${occupied.localIndex}`;
    if (!window.confirm(`ตำแหน่ง ${land.cadName} ถูกใช้โดย X-ray Land ${occupied.localIndex} อยู่แล้ว ระบบจะ${swapText} ต้องการดำเนินการต่อหรือไม่?`)) return;
    changes.push({ mapping: occupied, before: snapshotMapping(occupied), after: oldLand ? stateForLand(occupied, oldLand, { manual: true, anchorLocked: false, confidence: 92, mappingMethod: 'manual-swap', duplicateCadNameCount: duplicateCountForLand(oldLand) }) : stateForUnmapped(occupied) });
  }
  changes.push({ mapping, before: snapshotMapping(mapping), after: stateForLand(mapping, land, { manual: true, anchorLocked: true, confidence: 100, mappingMethod: 'manual-anchor', duplicateCadNameCount: duplicateCountForLand(land) }) });
  applyTransaction(label, changes); state.selected = mapping; state.manualMode = false; els.manualButton.textContent = 'เลือก CAD ใหม่'; els.manualBanner.classList.add('hidden'); toast(`ตั้ง Anchor: X-ray ${mapping.localIndex} → ${land.cadName}`);
}
function selectLand(land) {
  if (!land) return; if (state.manualMode && state.selected) { directRemap(state.selected, land); return; }
  const existing = mappingByGlobalId().get(Number(land.globalId));
  if (existing) selectMapping(existing, false);
  else selectMapping({ sourceRow: null, componentName: currentComponent()?.name, packageName: currentComponent()?.packageName, localIndex: land.localIndex, componentId: land.componentId, globalId: land.globalId, cadName: land.cadName, left: land.left, top: land.top, centerX: land.centerX, centerY: land.centerY, width: land.width, length: land.length, measurement: null, confidence: 0, mapped: true, manual: false, anchorLocked: false, mappingMethod: 'xml-only', duplicateCadNameCount: duplicateCountForLand(land), raw: null }, false);
}
function toggleAnchor() {
  const mapping = state.selected; if (!mapping?.mapped) return; const before = snapshotMapping(mapping);
  const after = { ...before, anchorLocked: !mapping.anchorLocked, manual: true, confidence: !mapping.anchorLocked ? 100 : mapping.confidence, mappingMethod: !mapping.anchorLocked ? 'manual-anchor' : 'manual' };
  applyTransaction(after.anchorLocked ? 'Lock anchor' : 'Unlock anchor', [{ mapping, before, after }]); toast(after.anchorLocked ? `ล็อก X-ray ${mapping.localIndex} เป็น Anchor แล้ว` : `ปลด Anchor X-ray ${mapping.localIndex} แล้ว`);
}
function unmapSelected() {
  const mapping = state.selected; if (!mapping?.mapped) return; if (!window.confirm(`ยกเลิก Mapping ของ X-ray Land ${mapping.localIndex} ใช่หรือไม่?`)) return;
  applyTransaction('Unmap selected land', [{ mapping, before: snapshotMapping(mapping), after: stateForUnmapped(mapping) }]); toast(`ยกเลิก Mapping X-ray ${mapping.localIndex} แล้ว`);
}
function nudgeSelected(delta) {
  const mapping = state.selected; const component = currentComponent(); if (!mapping?.mapped || !component) return; const index = findLandIndex(component, mapping.globalId); const land = component.lands[index + delta];
  if (!land) return toast('ไม่สามารถเลื่อนได้ เพราะถึงขอบเขต CAD แล้ว'); directRemap(mapping, land, `Nudge selected ${delta > 0 ? '+1' : '-1'}`);
}
function search() {
  const query = els.searchInput.value.trim(); if (!query) return; const mappings = state.mappingData?.mappings || []; const number = Number(query); let matches = [];
  if (Number.isInteger(number)) { matches = currentMappings().filter((m) => Number(m.localIndex) === number); if (!matches.length) matches = mappings.filter((m) => Number(m.globalId) === number); }
  if (!matches.length) { const lower = query.toLowerCase(); matches = mappings.filter((m) => String(m.cadName).toLowerCase() === lower || String(m.alias || '').toLowerCase() === lower); }
  if (!matches.length && state.xmlData) {
    for (const component of state.xmlData.components) for (const land of component.lands) if (String(land.cadName).toLowerCase() === query.toLowerCase() || Number(land.globalId) === number) { state.selectedComponentId = component.id; els.componentSelect.value = component.id; fitView(); selectLand(land); toast('พบใน XML แต่ไม่มีแถว X-ray ที่จับคู่'); return; }
  }
  if (!matches.length) return toast(`ไม่พบ ${query}`); selectMapping(matches[0], true); if (matches.length > 1) toast(`พบ ${matches.length} ตำแหน่ง เลือกตำแหน่งแรกและแสดงคำเตือนชื่อซ้ำ`);
}
function openTeachPanel() { if (!state.mappingData) return; els.teachOverlay.classList.remove('hidden'); renderTeachPanel(); }
function closeTeachPanel() { els.teachOverlay.classList.add('hidden'); }
function renderTeachPanel() {
  const component = currentComponent(); const mappings = currentMappings(); const anchors = mappings.filter((mapping) => mapping.anchorLocked).sort((a, b) => Number(a.localIndex) - Number(b.localIndex));
  els.teachComponentLabel.textContent = component ? `${component.name} · ${formatInt.format(component.lands.length)} CAD lands · ${formatInt.format(mappings.length)} X-ray rows` : 'ยังไม่มี Component';
  els.anchorCountLabel.textContent = `${formatInt.format(anchors.length)} จุด`; els.anchorList.innerHTML = '';
  if (!anchors.length) els.anchorList.innerHTML = '<p class="empty-state">ยังไม่มี Anchor — เลือก Land แล้วกด “ล็อกเป็น Anchor”</p>';
  else {
    const fragment = document.createDocumentFragment();
    for (const mapping of anchors) {
      const item = document.createElement('div'); item.className = 'anchor-item'; const left = document.createElement('div'); left.innerHTML = `<span>X-ray</span><br><strong>${mapping.localIndex}</strong>`; const middle = document.createElement('div'); middle.innerHTML = `<span>CAD / XML</span><br><strong>${mapping.cadName || '—'} · ${mapping.globalId ?? '—'}</strong>`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'ปลด'; button.addEventListener('click', () => { state.selected = mapping; toggleAnchor(); }); item.append(left, middle, button); fragment.append(item);
    }
    els.anchorList.append(fragment);
  }
  els.clearAnchorsButton.disabled = anchors.length === 0; els.fillBetweenButton.disabled = anchors.length < 2; renderPreviewSummary();
}
function readPatternOptions(overrides = {}) {
  const optionalNumber = (value) => value === '' ? null : Number(value);
  return { mappings: currentMappings(), component: currentComponent(), direction: overrides.direction || els.patternDirection.value, userShift: overrides.userShift ?? Number(els.patternShift.value || 0), startLocal: overrides.startLocal ?? optionalNumber(els.patternStart.value), endLocal: overrides.endLocal ?? optionalNumber(els.patternEnd.value), preserveAnchors: els.preserveAnchors.checked };
}
function createPatternPreview(overrides = {}) {
  const preview = createSequencePreview(readPatternOptions(overrides)); if (!preview.ok) return toast(preview.error, 4200);
  preview.lookup = new Map(preview.proposals.filter((proposal) => proposal.land).map((proposal) => [Number(proposal.land.globalId), proposal])); state.preview = preview;
  if (overrides.direction) els.patternDirection.value = overrides.direction; if (overrides.startLocal != null) els.patternStart.value = overrides.startLocal; if (overrides.endLocal != null) els.patternEnd.value = overrides.endLocal;
  renderPreviewSummary(); renderTable(); draw(); els.manualBanner.textContent = `Preview ${preview.direction}: ใช้ได้ ${formatInt.format(preview.counts.applicable)} · Conflict ${formatInt.format(preview.counts.conflicts + preview.counts.outOfRange)}`; els.manualBanner.classList.remove('hidden'); els.manualBanner.classList.add('preview-active');
}
function previewBetweenAnchors() { const range = getAnchorRange(currentMappings()); if (!range) return toast('ต้องมี Anchor อย่างน้อย 2 จุด'); createPatternPreview({ startLocal: range.start, endLocal: range.end }); }
function clearPreview() { state.preview = null; els.manualBanner.classList.add('hidden'); els.manualBanner.classList.remove('preview-active'); renderPreviewSummary(); renderTable(); draw(); }
function renderPreviewSummary() {
  const preview = state.preview;
  if (!preview) {
    els.previewTitle.textContent = 'ยังไม่มี Preview'; els.previewDirectionBadge.textContent = '—'; els.previewDirectionBadge.className = 'status-pill muted'; els.previewApplicable.textContent = '0'; els.previewHigh.textContent = '0'; els.previewReview.textContent = '0'; els.previewConflict.textContent = '0'; els.previewFormula.textContent = 'วาง Anchor แล้วกดสร้าง Preview'; els.previewWarning.classList.add('hidden'); els.applyPatternButton.disabled = true; els.applyHighButton.disabled = true; els.clearPreviewButton.disabled = true; return;
  }
  const counts = preview.counts; els.previewTitle.textContent = `${formatInt.format(counts.total)} จุดในช่วง ${preview.range.start}–${preview.range.end}`; els.previewDirectionBadge.textContent = preview.direction === 'reverse' ? 'Reverse' : 'Forward'; els.previewDirectionBadge.className = 'status-pill ready';
  els.previewApplicable.textContent = formatInt.format(counts.applicable); els.previewHigh.textContent = formatInt.format(counts.highConfidence); els.previewReview.textContent = formatInt.format(counts.review); els.previewConflict.textContent = formatInt.format(counts.conflicts + counts.outOfRange); els.previewFormula.innerHTML = `${preview.formula}<br>Anchor ${counts.anchors} จุด · residual สูงสุด ${preview.fit.maxResidual}`;
  const warnings = []; if (!counts.anchors) warnings.push('Preview นี้ไม่มี Anchor ยืนยัน จึงเป็นเพียงสมมติฐานและ Confidence ต่ำ'); if (preview.fit.maxResidual > 0) warnings.push('Anchor บางจุดไม่อยู่ในแพตเทิร์น +1/−1 เดียวกัน ควรตรวจจุดอ้างอิง'); if (counts.conflicts || counts.outOfRange) warnings.push(`มี Conflict/Out of range ${counts.conflicts + counts.outOfRange} จุด ระบบจะไม่ Apply จุดเหล่านี้`);
  if (warnings.length) { els.previewWarning.textContent = warnings.join(' · '); els.previewWarning.classList.remove('hidden'); } else els.previewWarning.classList.add('hidden');
  els.applyPatternButton.disabled = counts.applicable === 0; els.applyHighButton.disabled = counts.highConfidence === 0; els.clearPreviewButton.disabled = false;
}
function applyPattern(highOnly = false) {
  const preview = state.preview; if (!preview) return; const changes = [];
  for (const proposal of preview.proposals) {
    if (!proposal.land || ['conflict', 'anchor-conflict', 'out-of-range'].includes(proposal.status) || (highOnly && proposal.confidence < 95) || proposal.mapping.anchorLocked) continue;
    changes.push({ mapping: proposal.mapping, before: snapshotMapping(proposal.mapping), after: stateForLand(proposal.mapping, proposal.land, { manual: true, anchorLocked: false, confidence: proposal.confidence, mappingMethod: `taught-${preview.direction}`, duplicateCadNameCount: duplicateCountForLand(proposal.land) }) });
  }
  if (!changes.length) return toast('ไม่มีรายการที่สามารถ Apply ได้'); applyTransaction(highOnly ? 'Apply high-confidence pattern' : 'Apply manual taught pattern', changes); toast(`Apply Pattern แล้ว ${formatInt.format(changes.length)} จุด`);
}
function clearAllAnchors() {
  const anchors = currentMappings().filter((mapping) => mapping.anchorLocked); if (!anchors.length) return; if (!window.confirm(`ปลด Anchor ทั้งหมด ${anchors.length} จุดใช่หรือไม่?`)) return;
  const changes = anchors.map((mapping) => ({ mapping, before: snapshotMapping(mapping), after: { ...snapshotMapping(mapping), anchorLocked: false, mappingMethod: mapping.manual ? 'manual' : 'auto-sequence' } })); applyTransaction('Clear all anchors', changes); toast('ปลด Anchor ทั้งหมดแล้ว');
}
function shiftCurrentMappings(delta) {
  const component = currentComponent(); if (!component) return; const start = els.patternStart.value === '' ? -Infinity : Number(els.patternStart.value); const end = els.patternEnd.value === '' ? Infinity : Number(els.patternEnd.value);
  const moving = currentMappings().filter((m) => Number(m.localIndex) >= Math.min(start, end) && Number(m.localIndex) <= Math.max(start, end)); const movingSet = new Set(moving);
  const occupiedOutside = new Set(currentMappings().filter((m) => (!movingSet.has(m) || m.anchorLocked) && m.mapped).map((m) => Number(m.globalId))); const changes = [];
  for (const mapping of moving) {
    if (!mapping.mapped || mapping.anchorLocked) continue; const index = findLandIndex(component, mapping.globalId); const land = component.lands[index + delta]; if (!land || occupiedOutside.has(Number(land.globalId))) continue;
    changes.push({ mapping, before: snapshotMapping(mapping), after: stateForLand(mapping, land, { manual: true, anchorLocked: false, confidence: Math.min(mapping.confidence || 85, 90), mappingMethod: `manual-shift-${delta > 0 ? 'plus' : 'minus'}1`, duplicateCadNameCount: duplicateCountForLand(land) }) });
  }
  if (!changes.length) return toast('ไม่มีรายการที่เลื่อนได้ หรือชนกับ Anchor/ขอบเขต'); if (!window.confirm(`Shift Mapping ${delta > 0 ? '+1' : '-1'} จำนวน ${changes.length} จุดใช่หรือไม่?`)) return; applyTransaction(`Shift mappings ${delta > 0 ? '+1' : '-1'}`, changes); toast(`Shift แล้ว ${formatInt.format(changes.length)} จุด`);
}
function unmapRange() {
  const start = els.patternStart.value === '' ? -Infinity : Number(els.patternStart.value); const end = els.patternEnd.value === '' ? Infinity : Number(els.patternEnd.value);
  const targets = currentMappings().filter((m) => Number(m.localIndex) >= Math.min(start, end) && Number(m.localIndex) <= Math.max(start, end) && !m.anchorLocked && m.mapped);
  if (!targets.length) return toast('ไม่มีรายการในช่วงที่สามารถ Unmap ได้'); if (!window.confirm(`Unmap ${targets.length} จุดในช่วงนี้ โดยรักษา Anchor ไว้ใช่หรือไม่?`)) return; applyTransaction('Unmap range', targets.map((mapping) => ({ mapping, before: snapshotMapping(mapping), after: stateForUnmapped(mapping) }))); toast(`Unmap แล้ว ${formatInt.format(targets.length)} จุด`);
}
function exportCsv() {
  const mappings = state.mappingData?.mappings || []; const headers = ['xray_local_land','xml_global_land_id','cad_name','alias','component','package','center_x_mm','center_y_mm','left_mm','top_mm','width_mm','length_mm','measurement','confidence','manual','anchor_locked','mapping_method','duplicate_cad_name_count','source_row']; const lines = [headers.join(',')];
  for (const m of mappings) lines.push([m.localIndex, m.globalId, m.cadName, m.alias || '', m.componentName, m.packageName, m.centerX, m.centerY, m.left, m.top, m.width, m.length, m.measurement, m.confidence, m.manual, m.anchorLocked, m.mappingMethod, m.duplicateCadNameCount, m.sourceRow].map(escapeCsv).join(','));
  downloadBlob(new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${state.xmlData?.board?.Name || 'bga'}_land_mapping_v0.3.0.csv`);
}
function exportJson() {
  const payload = { app: 'BGA Land Mapper', version: '0.3.0', exportedAt: new Date().toISOString(), files: state.fileNames, board: state.xmlData?.board, schema: state.schema ? { componentCol: state.schema.componentCol, packageCol: state.schema.packageCol, landCol: state.schema.landCol, measurementCol: state.schema.measurementCol } : null, componentSummaries: state.mappingData?.componentSummaries,
    overrides: (state.mappingData?.mappings || []).filter((m) => m.manual || m.alias || m.anchorLocked || !m.mapped).map((m) => ({ sourceRow: m.sourceRow, localIndex: m.localIndex, componentName: m.componentName, componentId: m.componentId, globalId: m.globalId, cadName: m.cadName, alias: m.alias || '', manual: Boolean(m.manual), mapped: Boolean(m.mapped), anchorLocked: Boolean(m.anchorLocked), confidence: m.confidence, mappingMethod: m.mappingMethod })) };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'bga-land-mapper-project-v0.3.0.json');
}
async function restoreBackup(file) {
  if (!file || !state.mappingData || !state.xmlData) return;
  try {
    const payload = JSON.parse(await file.text()); if (!Array.isArray(payload.overrides)) throw new Error('ไฟล์ Backup ไม่มี overrides');
    const bySourceRow = new Map(state.mappingData.mappings.map((m) => [Number(m.sourceRow), m])); const byKey = new Map(state.mappingData.mappings.map((m) => [`${m.componentName}\u0000${m.localIndex}`, m])); const changes = []; let skipped = 0;
    for (const item of payload.overrides) {
      const mapping = bySourceRow.get(Number(item.sourceRow)) || byKey.get(`${item.componentName}\u0000${item.localIndex}`); if (!mapping) { skipped += 1; continue; }
      let after;
      if (item.mapped === false || item.globalId == null) after = stateForUnmapped(mapping);
      else {
        const component = state.xmlData.componentById.get(String(item.componentId || mapping.componentId)); const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(item.globalId)); if (!land) { skipped += 1; continue; }
        after = stateForLand(mapping, land, { manual: item.manual ?? true, anchorLocked: Boolean(item.anchorLocked), confidence: Number(item.confidence ?? 100), mappingMethod: item.mappingMethod || 'restored-backup', duplicateCadNameCount: duplicateCountForLand(land) });
      }
      after.alias = item.alias || ''; changes.push({ mapping, before: snapshotMapping(mapping), after });
    }
    if (!changes.length) throw new Error('ไม่พบรายการใน Backup ที่ตรงกับโปรเจกต์นี้'); applyTransaction('Restore backup JSON', changes); toast(`นำเข้า Backup แล้ว ${formatInt.format(changes.length)} รายการ${skipped ? ` · ข้าม ${skipped}` : ''}`, 4500);
  } catch (error) { console.error(error); toast(`นำเข้า Backup ไม่สำเร็จ: ${error.message}`, 5200); }
  finally { els.restoreFile.value = ''; }
}
function resizeCanvas() { draw(); renderHistogram(); }

els.projectFile.addEventListener('change', (event) => processFile(event.target.files[0]));
els.dropZone.addEventListener('dragover', (event) => { event.preventDefault(); els.dropZone.classList.add('drag'); });
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag'));
els.dropZone.addEventListener('drop', (event) => { event.preventDefault(); els.dropZone.classList.remove('drag'); processFile(event.dataTransfer.files[0]); });
els.restoreButton.addEventListener('click', () => els.restoreFile.click());
els.restoreFile.addEventListener('change', (event) => restoreBackup(event.target.files[0]));
els.resetButton.addEventListener('click', resetProject); els.remapButton.addEventListener('click', runMapping);
els.componentSelect.addEventListener('change', () => { state.selectedComponentId = els.componentSelect.value; state.selected = null; state.preview = null; state.page = 1; clearDetails(); updateStats(); renderTable(); renderTeachPanel(); fitView(); renderHistogram(); });
els.histogramBins.addEventListener('change', renderHistogram);
els.heatmapToggle.addEventListener('change', draw); els.labelToggle.addEventListener('change', draw); els.fitButton.addEventListener('click', fitView); els.zoomInButton.addEventListener('click', () => zoomAt(1.3)); els.zoomOutButton.addEventListener('click', () => zoomAt(1 / 1.3));
els.searchButton.addEventListener('click', search); els.searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') search(); });
els.tableFilter.addEventListener('change', () => { state.filter = els.tableFilter.value; state.page = 1; renderTable(); }); els.prevPage.addEventListener('click', () => { state.page -= 1; renderTable(); }); els.nextPage.addEventListener('click', () => { state.page += 1; renderTable(); });
els.exportCsvButton.addEventListener('click', exportCsv); els.exportJsonButton.addEventListener('click', exportJson);
els.manualButton.addEventListener('click', () => { if (!state.selected) return; state.manualMode = !state.manualMode; els.manualButton.textContent = state.manualMode ? 'ยกเลิกเลือก CAD' : 'เลือก CAD ใหม่'; els.manualBanner.textContent = `เลือกตำแหน่ง CAD ใหม่ให้ X-ray Land ${state.selected.localIndex} — จุดที่เลือกจะถูกล็อกเป็น Anchor`; els.manualBanner.classList.toggle('hidden', !state.manualMode); els.manualBanner.classList.remove('preview-active'); });
els.teachButton.addEventListener('click', openTeachPanel); els.undoButton.addEventListener('click', undo); els.redoButton.addEventListener('click', redo); els.anchorButton.addEventListener('click', toggleAnchor); els.unmapButton.addEventListener('click', unmapSelected); els.nudgePrevButton.addEventListener('click', () => nudgeSelected(-1)); els.nudgeNextButton.addEventListener('click', () => nudgeSelected(1));
els.saveAliasButton.addEventListener('click', () => { if (!state.selected) return; const before = snapshotMapping(state.selected); const after = { ...before, alias: els.aliasInput.value.trim() }; applyTransaction('Edit note', [{ mapping: state.selected, before, after }]); toast('บันทึกหมายเหตุแล้ว'); });
els.copyRawButton.addEventListener('click', async () => { await navigator.clipboard.writeText(els.rawData.textContent); toast('คัดลอกข้อมูลต้นทางแล้ว'); });
els.closeTeachButton.addEventListener('click', closeTeachPanel); els.teachOverlay.addEventListener('click', (event) => { if (event.target === els.teachOverlay) closeTeachPanel(); }); els.clearAnchorsButton.addEventListener('click', clearAllAnchors); els.previewPatternButton.addEventListener('click', () => createPatternPreview()); els.fillBetweenButton.addEventListener('click', previewBetweenAnchors); els.clearPreviewButton.addEventListener('click', clearPreview); els.applyPatternButton.addEventListener('click', () => applyPattern(false)); els.applyHighButton.addEventListener('click', () => applyPattern(true));
els.previewForwardButton.addEventListener('click', () => { els.patternStart.value = ''; els.patternEnd.value = ''; createPatternPreview({ direction: 'forward' }); });
els.previewReverseButton.addEventListener('click', () => { els.patternStart.value = ''; els.patternEnd.value = ''; createPatternPreview({ direction: 'reverse' }); });
els.shiftAllPrevButton.addEventListener('click', () => shiftCurrentMappings(-1)); els.shiftAllNextButton.addEventListener('click', () => shiftCurrentMappings(1)); els.unmapRangeButton.addEventListener('click', unmapRange);
els.canvas.addEventListener('wheel', (event) => { event.preventDefault(); const point = getCanvasPoint(event); zoomAt(event.deltaY < 0 ? 1.16 : 1 / 1.16, point.x, point.y); }, { passive: false });
els.canvas.addEventListener('pointerdown', (event) => { els.canvas.setPointerCapture(event.pointerId); state.dragging = true; state.lastPointer = getCanvasPoint(event); state.dragStart = { ...state.lastPointer }; });
els.canvas.addEventListener('pointermove', (event) => { const point = getCanvasPoint(event); if (state.dragging && state.lastPointer) { state.view.offsetX += point.x - state.lastPointer.x; state.view.offsetY += point.y - state.lastPointer.y; state.lastPointer = point; draw(); els.tooltip.classList.add('hidden'); return; } state.hoveredLand = findNearestLand(point.x, point.y); showTooltip(event, state.hoveredLand); });
els.canvas.addEventListener('pointerup', (event) => { const point = getCanvasPoint(event); const moved = state.dragStart ? Math.hypot(point.x - state.dragStart.x, point.y - state.dragStart.y) : 0; state.dragging = false; state.lastPointer = null; state.dragStart = null; if (moved < 4) selectLand(findNearestLand(point.x, point.y)); });
els.canvas.addEventListener('pointercancel', () => { state.dragging = false; state.lastPointer = null; state.dragStart = null; }); els.canvas.addEventListener('pointerleave', () => els.tooltip.classList.add('hidden'));
window.addEventListener('keydown', (event) => { const tag = document.activeElement?.tagName; if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); } if (event.key === 'Escape') { state.manualMode = false; els.manualButton.textContent = 'เลือก CAD ใหม่'; els.manualBanner.classList.add('hidden'); closeTeachPanel(); } });
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.installPrompt = event; els.installButton.classList.remove('hidden'); });
els.installButton.addEventListener('click', async () => { if (!state.installPrompt) return; state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; els.installButton.classList.add('hidden'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(els.canvas);
resizeObserver.observe(els.measurementHistogram);
resetProject();
