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
import {
  buildCadNameAudit,
  cadAuditToCsv,
  cadLandKey,
  generateCadRenames,
  normalizeCadName,
  rewriteCadXml,
} from './cad-inspector.js';
import { buildCadComparison, cadComparisonToCsv } from './cad-compare.js';
import { buildComponentReportXlsx } from './xlsx-report.js';
import { buildZones, canvasToPngBytes, histogramModel, renderHistogramImage, renderOverviewImage, renderZoneImage } from './component-report.js';

const $ = (id) => document.getElementById(id);
const els = {
  projectFile: $('projectFile'), dropZone: $('dropZone'), resetButton: $('resetButton'),
  originalCadButton: $('originalCadButton'), originalCadFile: $('originalCadFile'), generatedCadButton: $('generatedCadButton'), generatedCadFile: $('generatedCadFile'),
  restoreButton: $('restoreButton'), restoreFile: $('restoreFile'),
  xmlFileName: $('xmlFileName'), generatedXmlFileName: $('generatedXmlFileName'), xlsxFileName: $('xlsxFileName'), importMessage: $('importMessage'),
  progressWrap: $('progressWrap'), projectStatus: $('projectStatus'),
  componentColumn: $('componentColumn'), packageColumn: $('packageColumn'), landColumn: $('landColumn'),
  measurementColumn: $('measurementColumn'), remapButton: $('remapButton'),
  mappedStat: $('mappedStat'), verifiedStat: $('verifiedStat'), unmappedStat: $('unmappedStat'), xmlLandStat: $('xmlLandStat'), componentStat: $('componentStat'),
  mappingFormula: $('mappingFormula'), activeCadSelect: $('activeCadSelect'), componentSelect: $('componentSelect'), heatmapToggle: $('heatmapToggle'), labelToggle: $('labelToggle'),
  duplicateToggle: $('duplicateToggle'), duplicateOnlyToggle: $('duplicateOnlyToggle'), cadCompareOverlayToggle: $('cadCompareOverlayToggle'), duplicateNameSelect: $('duplicateNameSelect'), duplicateSummaryMini: $('duplicateSummaryMini'),
  fitButton: $('fitButton'), zoomInButton: $('zoomInButton'), zoomOutButton: $('zoomOutButton'),
  searchInput: $('searchInput'), searchButton: $('searchButton'), cadInspectorButton: $('cadInspectorButton'), cadCompareButton: $('cadCompareButton'), manualButton: $('manualButton'), teachButton: $('teachButton'),
  undoButton: $('undoButton'), redoButton: $('redoButton'), exportCsvButton: $('exportCsvButton'), exportExcelButton: $('exportExcelButton'), exportJsonButton: $('exportJsonButton'),
  canvas: $('cadCanvas'), viewerTitle: $('viewerTitle'), viewerSubtitle: $('viewerSubtitle'), tooltip: $('tooltip'), manualBanner: $('manualBanner'),
  editCurrentLabel: $('editCurrentLabel'), exitEditButton: $('exitEditButton'), editPrevButton: $('editPrevButton'), editNextButton: $('editNextButton'), editAutoNext: $('editAutoNext'), editLockConfirmed: $('editLockConfirmed'),
  tableFilter: $('tableFilter'), mappingTableBody: $('mappingTableBody'), tableSummary: $('tableSummary'), prevPage: $('prevPage'), nextPage: $('nextPage'), pageLabel: $('pageLabel'),
  selectedTitle: $('selectedTitle'), selectedSubTitle: $('selectedSubTitle'), dLocal: $('dLocal'), dGlobal: $('dGlobal'), dCad: $('dCad'), dComponent: $('dComponent'),
  dX: $('dX'), dY: $('dY'), dMeasurement: $('dMeasurement'), dConfidence: $('dConfidence'), dRow: $('dRow'), dMethod: $('dMethod'), dVerified: $('dVerified'), dAnchor: $('dAnchor'),
  measurementHistogram: $('measurementHistogram'), histogramBins: $('histogramBins'), histogramMessage: $('histogramMessage'), expandHistogramButton: $('expandHistogramButton'),
  histCount: $('histCount'), histMin: $('histMin'), histAverage: $('histAverage'), histMedian: $('histMedian'), histMax: $('histMax'),
  histogramOverlay: $('histogramOverlay'), closeHistogramButton: $('closeHistogramButton'), detailedHistogramPart: $('detailedHistogramPart'),
  detailedHistogramCanvas: $('detailedHistogramCanvas'), detailedHistogramBins: $('detailedHistogramBins'), histogramYMode: $('histogramYMode'),
  histogramRangeMin: $('histogramRangeMin'), histogramRangeMax: $('histogramRangeMax'), applyHistogramRangeButton: $('applyHistogramRangeButton'),
  resetHistogramRangeButton: $('resetHistogramRangeButton'), zoomHistogramBinButton: $('zoomHistogramBinButton'), exportHistogramButton: $('exportHistogramButton'),
  histogramTooltip: $('histogramTooltip'), histogramSelectionLabel: $('histogramSelectionLabel'), histogramCadFilter: $('histogramCadFilter'), detailedHistogramMessage: $('detailedHistogramMessage'),
  detailHistTotal: $('detailHistTotal'), detailHistInRange: $('detailHistInRange'), detailHistMin: $('detailHistMin'), detailHistQ1: $('detailHistQ1'),
  detailHistAverage: $('detailHistAverage'), detailHistMedian: $('detailHistMedian'), detailHistQ3: $('detailHistQ3'), detailHistMax: $('detailHistMax'), detailHistStdDev: $('detailHistStdDev'),
  selectedBinRange: $('selectedBinRange'), selectedBinCount: $('selectedBinCount'), selectedBinPercent: $('selectedBinPercent'), selectedBinCumulative: $('selectedBinCumulative'),
  anchorButton: $('anchorButton'), unmapButton: $('unmapButton'), nudgePrevButton: $('nudgePrevButton'), nudgeNextButton: $('nudgeNextButton'),
  aliasInput: $('aliasInput'), saveAliasButton: $('saveAliasButton'), duplicateWarning: $('duplicateWarning'), rawData: $('rawData'), copyRawButton: $('copyRawButton'),
  duplicatePanel: $('duplicatePanel'), duplicateGroupCount: $('duplicateGroupCount'), duplicatePanelMessage: $('duplicatePanelMessage'), duplicatePositionList: $('duplicatePositionList'), fitDuplicateButton: $('fitDuplicateButton'), clearDuplicateButton: $('clearDuplicateButton'),
  cadInspectorOverlay: $('cadInspectorOverlay'), closeCadInspectorButton: $('closeCadInspectorButton'), cadInspectorScope: $('cadInspectorScope'), cadMaxLength: $('cadMaxLength'), cadNamePrefix: $('cadNamePrefix'), cadIssueFilter: $('cadIssueFilter'), cadInspectorSearch: $('cadInspectorSearch'),
  cadAuditTotal: $('cadAuditTotal'), cadAuditValid: $('cadAuditValid'), cadAuditUnresolved: $('cadAuditUnresolved'), cadAuditDuplicateGroups: $('cadAuditDuplicateGroups'), cadAuditDuplicateLands: $('cadAuditDuplicateLands'), cadAuditTooLong: $('cadAuditTooLong'), cadAuditBlank: $('cadAuditBlank'), cadAuditChanged: $('cadAuditChanged'),
  cadAutoFixButton: $('cadAutoFixButton'), cadRenameAllButton: $('cadRenameAllButton'), cadResetNamesButton: $('cadResetNamesButton'), cadExportReportButton: $('cadExportReportButton'), cadApplyNamesButton: $('cadApplyNamesButton'), cadExportXmlButton: $('cadExportXmlButton'), cadInspectorMessage: $('cadInspectorMessage'),
  cadInspectorTableBody: $('cadInspectorTableBody'), cadInspectorTableSummary: $('cadInspectorTableSummary'), cadInspectorPrevPage: $('cadInspectorPrevPage'), cadInspectorNextPage: $('cadInspectorNextPage'), cadInspectorPageLabel: $('cadInspectorPageLabel'),
  cadCompareOverlay: $('cadCompareOverlay'), closeCadCompareButton: $('closeCadCompareButton'), cadCompareTolerance: $('cadCompareTolerance'), cadCompareFilter: $('cadCompareFilter'), cadCompareSearch: $('cadCompareSearch'), rebuildCadCompareButton: $('rebuildCadCompareButton'),
  cadCompareComponents: $('cadCompareComponents'), cadCompareMatched: $('cadCompareMatched'), cadCompareRenamed: $('cadCompareRenamed'), cadCompareMoved: $('cadCompareMoved'), cadCompareMissing: $('cadCompareMissing'), cadCompareExtra: $('cadCompareExtra'), cadCompareMessage: $('cadCompareMessage'),
  useOriginalCadButton: $('useOriginalCadButton'), useGeneratedCadButton: $('useGeneratedCadButton'), fitCadCompareButton: $('fitCadCompareButton'), exportCadCompareButton: $('exportCadCompareButton'), cadCompareTableBody: $('cadCompareTableBody'), cadCompareTableSummary: $('cadCompareTableSummary'), cadComparePrevPage: $('cadComparePrevPage'), cadCompareNextPage: $('cadCompareNextPage'), cadComparePageLabel: $('cadComparePageLabel'),
  teachOverlay: $('teachOverlay'), closeTeachButton: $('closeTeachButton'), teachComponentLabel: $('teachComponentLabel'),
  anchorCountLabel: $('anchorCountLabel'), anchorList: $('anchorList'), clearAnchorsButton: $('clearAnchorsButton'),
  patternDirection: $('patternDirection'), patternShift: $('patternShift'), patternStart: $('patternStart'), patternEnd: $('patternEnd'), preserveAnchors: $('preserveAnchors'),
  previewPatternButton: $('previewPatternButton'), fillBetweenButton: $('fillBetweenButton'), clearPreviewButton: $('clearPreviewButton'),
  previewTitle: $('previewTitle'), previewDirectionBadge: $('previewDirectionBadge'), previewApplicable: $('previewApplicable'), previewHigh: $('previewHigh'), previewReview: $('previewReview'), previewConflict: $('previewConflict'),
  previewFormula: $('previewFormula'), previewWarning: $('previewWarning'), applyPatternButton: $('applyPatternButton'), applyHighButton: $('applyHighButton'),
  previewForwardButton: $('previewForwardButton'), previewReverseButton: $('previewReverseButton'), shiftAllPrevButton: $('shiftAllPrevButton'), shiftAllNextButton: $('shiftAllNextButton'), unmapRangeButton: $('unmapRangeButton'),
  componentReportOverlay: $('componentReportOverlay'), closeComponentReportButton: $('closeComponentReportButton'), cancelComponentReportButton: $('cancelComponentReportButton'),
  componentReportScope: $('componentReportScope'), componentReportZones: $('componentReportZones'), componentReportLabels: $('componentReportLabels'), componentReportNameSource: $('componentReportNameSource'), componentReportResolution: $('componentReportResolution'), componentReportHeatmap: $('componentReportHeatmap'),
  componentReportPartCount: $('componentReportPartCount'), componentReportLandCount: $('componentReportLandCount'), componentReportZoneCount: $('componentReportZoneCount'), componentReportMeasurementCount: $('componentReportMeasurementCount'), componentReportMessage: $('componentReportMessage'), generateComponentReportButton: $('generateComponentReportButton'),
  toast: $('toast'), installButton: $('installButton'),
};

const state = {
  xmlText: null, xlsxBuffer: null, xmlData: null, xlsxData: null, schema: null, mappingData: null,
  selectedComponentId: null, selected: null, hoveredLand: null, manualMode: false, preview: null,
  edit: { enabled: false, autoNext: true, lockConfirmed: true },
  undoStack: [], redoStack: [], page: 1, pageSize: 80, filter: 'all',
  view: { scale: 1, offsetX: 0, offsetY: 0 }, dragging: false, lastPointer: null, dragStart: null,
  fileNames: { xml: '', generatedXml: '', xlsx: '' }, installPrompt: null,
  cadFiles: { original: null, generated: null }, activeCadRole: null,
  cadCompare: { result: null, tolerance: 0.08, filter: 'changed', search: '', page: 1, pageSize: 120, selectedRow: null, overlayEnabled: false },
  histogram: { rangeMin: null, rangeMax: null, selectedBin: null, hoveredBin: null, layout: null, drag: null, filterEnabled: false },
  duplicateView: { enabled: true, dimOthers: false, selectedName: '' },
  cadInspector: { renames: new Map(), maxLength: 5, prefix: 'L', scope: 'all', filter: 'issues', search: '', page: 1, pageSize: 120, audit: null },
};

const ctx = els.canvas.getContext('2d', { alpha: false });
const histogramCtx = els.measurementHistogram.getContext('2d');
const detailedHistogramCtx = els.detailedHistogramCanvas.getContext('2d');
const formatInt = new Intl.NumberFormat('th-TH');
const formatFloat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 4 });

function cadRoleLabel(role) { return role === 'generated' ? 'Generated CAD' : 'Original CAD'; }
function activeCadFile() { return state.activeCadRole ? state.cadFiles[state.activeCadRole] : null; }
function syncCadFileLabels() {
  els.xmlFileName.textContent = state.cadFiles.original?.name || '—';
  els.generatedXmlFileName.textContent = state.cadFiles.generated?.name || '—';
  els.xlsxFileName.textContent = state.fileNames.xlsx || '—';
}
function populateActiveCadSelect() {
  const previous = state.activeCadRole;
  els.activeCadSelect.innerHTML = '';
  for (const role of ['original', 'generated']) {
    const file = state.cadFiles[role]; if (!file) continue;
    const option = document.createElement('option'); option.value = role;
    option.textContent = `${cadRoleLabel(role)} · ${file.data.components.length} parts · ${formatInt.format(file.data.totalLands)} lands`;
    els.activeCadSelect.append(option);
  }
  if (!els.activeCadSelect.options.length) {
    const option = document.createElement('option'); option.value = ''; option.textContent = '— ยังไม่มี CAD —'; els.activeCadSelect.append(option);
    els.activeCadSelect.disabled = true;
  } else {
    els.activeCadSelect.disabled = false;
    els.activeCadSelect.value = state.activeCadRole && state.cadFiles[state.activeCadRole] ? state.activeCadRole : (previous && state.cadFiles[previous] ? previous : els.activeCadSelect.options[0].value);
  }
}
function saveActiveCadSession() {
  const file = activeCadFile(); if (!file) return;
  file.renames = state.cadInspector.renames;
}
function rebuildMappingForActiveCad() {
  if (!state.xmlData || !state.xlsxData) {
    state.schema = null; state.mappingData = null; state.selected = null; state.page = 1;
    for (const select of [els.componentColumn, els.packageColumn, els.landColumn, els.measurementColumn]) select.innerHTML = '';
    els.mappingTableBody.innerHTML = '';
    return;
  }
  state.schema = autoDetectSchema(state.xlsxData.activeSheet.rows, state.xmlData);
  populateSchemaControls();
  state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema);
  normalizeMappings();
  state.undoStack = []; state.redoStack = []; state.preview = null; state.selected = null; state.page = 1;
}
function activateCad(role, { rebuild = true, fit = true } = {}) {
  const file = state.cadFiles[role]; if (!file) return false;
  saveActiveCadSession();
  state.activeCadRole = role;
  state.xmlText = file.text; state.xmlData = file.data; state.fileNames.xml = file.name;
  state.cadInspector.renames = file.renames || new Map(); file.renames = state.cadInspector.renames;
  state.cadInspector.audit = null; state.selected = null; state.preview = null; state.page = 1; state.duplicateView.selectedName = '';
  resetHistogramState();
  if (rebuild) rebuildMappingForActiveCad();
  populateActiveCadSelect();
  populateComponents(state.selectedComponentId);
  updateStats(); renderTable(); renderTeachPanel(); refreshDuplicateControls(); clearDetails();
  if (fit) fitView(); else draw();
  renderHistogram(); renderDetailedHistogram();
  return true;
}
function storeCadFile(role, xmlText, name) {
  const data = parseInspectionXml(xmlText);
  state.cadFiles[role] = { role, name, text: xmlText, data, renames: new Map() };
  if (role === 'generated') state.fileNames.generatedXml = name;
  syncCadFileLabels(); populateActiveCadSelect();
  return state.cadFiles[role];
}
function canCompareCad() { return Boolean(state.cadFiles.original?.data && state.cadFiles.generated?.data); }
function rebuildCadComparison({ showToast = false } = {}) {
  if (!canCompareCad()) { state.cadCompare.result = null; updateCadCompareControls(); return null; }
  state.cadCompare.tolerance = Math.max(0.0001, Number(els.cadCompareTolerance.value) || state.cadCompare.tolerance || 0.08);
  state.cadCompare.result = buildCadComparison(state.cadFiles.original.data, state.cadFiles.generated.data, { coordinateTolerance: state.cadCompare.tolerance, moveTolerance: 0.001 });
  state.cadCompare.page = 1; state.cadCompare.selectedRow = null;
  updateCadCompareControls(); renderCadCompare(); draw();
  if (showToast) toast(`จับคู่ CAD ได้ ${formatInt.format(state.cadCompare.result.summary.matchedLands)} Land · เปลี่ยนชื่อ ${formatInt.format(state.cadCompare.result.summary.renamed + state.cadCompare.result.summary.renamedMoved)} จุด`);
  return state.cadCompare.result;
}
function updateCadCompareControls() {
  const ready = canCompareCad();
  els.cadCompareButton.disabled = !ready;
  els.cadCompareOverlayToggle.disabled = !ready || !state.cadCompare.result;
  els.cadCompareOverlayToggle.checked = Boolean(state.cadCompare.overlayEnabled && ready && state.cadCompare.result);
}
function cadCompareStatusLabel(status) {
  return ({ unchanged: 'ตรงกัน', renamed: 'เปลี่ยนชื่อ', moved: 'ตำแหน่งเปลี่ยน', 'renamed-moved': 'ชื่อและตำแหน่งเปลี่ยน', 'missing-generated': 'ไม่พบใน CAD ใหม่', 'extra-generated': 'เกินมาใน CAD ใหม่' })[status] || status;
}
function filteredCadCompareRows() {
  const result = state.cadCompare.result; if (!result) return [];
  const filter = state.cadCompare.filter;
  const search = state.cadCompare.search.trim().toLowerCase();
  return result.rows.filter((row) => {
    let pass = true;
    if (filter === 'changed') pass = row.status !== 'unchanged';
    else if (filter === 'renamed') pass = row.status === 'renamed' || row.status === 'renamed-moved';
    else if (filter === 'moved') pass = row.status === 'moved' || row.status === 'renamed-moved';
    else if (filter === 'missing') pass = row.status === 'missing-generated' || row.status === 'extra-generated';
    if (!pass || !search) return pass;
    return [row.originalComponentName, row.generatedComponentName, row.originalGlobalId, row.generatedGlobalId, row.originalName, row.generatedName, row.status].some((value) => String(value ?? '').toLowerCase().includes(search));
  });
}
function renderCadCompare() {
  const result = state.cadCompare.result;
  els.cadCompareTableBody.innerHTML = '';
  if (!result) {
    for (const id of ['cadCompareComponents','cadCompareMatched','cadCompareRenamed','cadCompareMoved','cadCompareMissing','cadCompareExtra']) els[id].textContent = '0';
    els.cadCompareMessage.textContent = 'อัปโหลด Original CAD และ Generated CAD เพื่อเริ่มเปรียบเทียบ';
    els.cadCompareTableSummary.textContent = '0 รายการ'; els.cadComparePageLabel.textContent = '1 / 1'; return;
  }
  const summary = result.summary;
  els.cadCompareComponents.textContent = `${formatInt.format(summary.matchedComponents)} / ${formatInt.format(summary.originalComponents)}`;
  els.cadCompareMatched.textContent = formatInt.format(summary.matchedLands);
  els.cadCompareRenamed.textContent = formatInt.format(summary.renamed + summary.renamedMoved);
  els.cadCompareMoved.textContent = formatInt.format(summary.moved + summary.renamedMoved);
  els.cadCompareMissing.textContent = formatInt.format(summary.missingGenerated);
  els.cadCompareExtra.textContent = formatInt.format(summary.extraGenerated);
  els.cadCompareMessage.textContent = `จับคู่ XML ID ก่อน และใช้พิกัดภายใน ${formatFloat.format(summary.coordinateTolerance)} mm เป็นแผนสำรอง · Original ${state.cadFiles.original.name} ↔ Generated ${state.cadFiles.generated.name}`;
  const rows = filteredCadCompareRows();
  const pages = Math.max(1, Math.ceil(rows.length / state.cadCompare.pageSize));
  state.cadCompare.page = Math.max(1, Math.min(pages, state.cadCompare.page));
  const start = (state.cadCompare.page - 1) * state.cadCompare.pageSize;
  const shown = rows.slice(start, start + state.cadCompare.pageSize);
  for (const item of shown) {
    const tr = document.createElement('tr');
    if (state.cadCompare.selectedRow === item) tr.classList.add('active');
    const values = [
      item.originalComponentName || item.generatedComponentName || '—', item.originalGlobalId ?? '—', item.originalName || '—',
      item.generatedGlobalId ?? '—', item.generatedName || '—', item.distance == null ? '—' : formatFloat.format(item.distance), item.landMethod,
    ];
    for (const value of values) { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); }
    const statusTd = document.createElement('td'); const badge = document.createElement('span'); badge.className = `cad-compare-status ${item.status}`; badge.textContent = cadCompareStatusLabel(item.status); statusTd.append(badge); tr.append(statusTd);
    const actionTd = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.className = 'compare-locate-button'; button.textContent = 'ดู'; button.disabled = item.originalGlobalId == null && item.generatedGlobalId == null; button.addEventListener('click', () => locateCadCompareRow(item)); actionTd.append(button); tr.append(actionTd);
    tr.addEventListener('dblclick', () => locateCadCompareRow(item));
    els.cadCompareTableBody.append(tr);
  }
  if (!shown.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 9; td.className = 'empty-state'; td.textContent = 'ไม่พบรายการตามตัวกรอง'; tr.append(td); els.cadCompareTableBody.append(tr); }
  els.cadCompareTableSummary.textContent = `${formatInt.format(rows.length)} รายการ · แสดง ${rows.length ? formatInt.format(start + 1) : 0}–${formatInt.format(Math.min(start + shown.length, rows.length))}`;
  els.cadComparePageLabel.textContent = `${state.cadCompare.page} / ${pages}`;
  els.cadComparePrevPage.disabled = state.cadCompare.page <= 1; els.cadCompareNextPage.disabled = state.cadCompare.page >= pages;
}
function openCadCompare() {
  if (!canCompareCad()) return toast('กรุณาอัปโหลด Original CAD และ Generated CAD ก่อน');
  if (!state.cadCompare.result) rebuildCadComparison();
  els.cadCompareTolerance.value = state.cadCompare.tolerance;
  els.cadCompareFilter.value = state.cadCompare.filter; els.cadCompareSearch.value = state.cadCompare.search;
  renderCadCompare(); els.cadCompareOverlay.classList.remove('hidden');
}
function closeCadCompare() { els.cadCompareOverlay.classList.add('hidden'); }
function locateCadCompareRow(row) {
  state.cadCompare.selectedRow = row; state.cadCompare.overlayEnabled = true; updateCadCompareControls();
  const role = row.originalGlobalId != null ? 'original' : 'generated';
  activateCad(role, { rebuild: true, fit: false });
  const componentId = role === 'original' ? row.originalComponentId : row.generatedComponentId;
  if (componentId != null) {
    const targetComponent = state.xmlData?.componentById.get(String(componentId));
    let option = [...els.componentSelect.options].find((candidate) => candidate.value === String(componentId));
    if (!option && targetComponent) {
      option = document.createElement('option'); option.value = String(componentId);
      option.textContent = `${targetComponent.name || `ID ${targetComponent.id}`} · CAD Compare · ${formatInt.format(targetComponent.lands.length)} lands`;
      els.componentSelect.append(option);
    }
    state.selectedComponentId = String(componentId); els.componentSelect.value = String(componentId); refreshDuplicateControls();
  }
  const component = currentComponent();
  const globalId = role === 'original' ? row.originalGlobalId : row.generatedGlobalId;
  const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(globalId));
  if (land) selectLand(land);
  fitCadCompareRow(row); renderCadCompare(); closeCadCompare();
}
function fitCadCompareRow(row = state.cadCompare.selectedRow) {
  if (!row) return toast('เลือกรายการที่ต้องการดูก่อน');
  const lands = [];
  if (Number.isFinite(Number(row.originalX)) && Number.isFinite(Number(row.originalY))) lands.push({ centerX: Number(row.originalX), centerY: Number(row.originalY) });
  if (Number.isFinite(Number(row.generatedX)) && Number.isFinite(Number(row.generatedY))) lands.push({ centerX: Number(row.generatedX), centerY: Number(row.generatedY) });
  fitLands(lands, 1.5);
}
function exportCadComparison() {
  if (!state.cadCompare.result) return;
  const original = (state.cadFiles.original?.name || 'original').replace(/\.xml$/i, '');
  const generated = (state.cadFiles.generated?.name || 'generated').replace(/\.xml$/i, '');
  downloadBlob(new Blob(['\ufeff', cadComparisonToCsv(state.cadCompare.result)], { type: 'text/csv;charset=utf-8' }), `${original}_to_${generated}_mapping.csv`);
}


function isVerifiedMapping(mapping) {
  if (!mapping) return false;
  return Boolean(mapping.verified || (mapping.anchorLocked && mapping.manual && ['manual-anchor', 'manual-direct', 'restored-confirmed'].includes(String(mapping.mappingMethod || ''))));
}
function isUnsafeGeneratedMapping(mapping) {
  const method = String(mapping?.mappingMethod || '');
  return method.startsWith('taught-') || method === 'manual-swap' || method === 'pattern-suggestion';
}
function updateEditPanel() {
  const enabled = Boolean(state.edit.enabled);
  state.manualMode = enabled;
  els.manualBanner.classList.toggle('hidden', !enabled);
  els.manualButton.classList.toggle('edit-active', enabled);
  els.manualButton.textContent = enabled ? 'ออกจาก Edit' : 'โหมด Edit';
  els.editAutoNext.checked = state.edit.autoNext;
  els.editLockConfirmed.checked = state.edit.lockConfirmed;
  const mapping = state.selected;
  els.editCurrentLabel.textContent = mapping
    ? `กำลังแก้ X-ray ${mapping.localIndex} · ปัจจุบัน ${mapping.cadName || 'Unmapped'}`
    : 'เลือก X-ray Land จากตารางหรือค้นหา';
  els.editPrevButton.disabled = !enabled || !mapping;
  els.editNextButton.disabled = !enabled || !mapping;
  els.canvas.style.cursor = enabled ? 'crosshair' : '';
  if (enabled) els.manualBanner.classList.remove('preview-active');
}
function setEditMode(enabled) {
  state.edit.enabled = Boolean(enabled);
  updateEditPanel();
  draw();
}
function advanceSelected(delta) {
  const mappings = currentMappings().slice().sort((a, b) => Number(a.localIndex) - Number(b.localIndex));
  if (!mappings.length) return;
  let index = state.selected ? mappings.indexOf(state.selected) : -1;
  index = Math.max(0, Math.min(mappings.length - 1, index + delta));
  selectMapping(mappings[index], false);
  updateEditPanel();
}

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

function cadInspectorComponentIds(scope = state.cadInspector.scope) {
  if (scope === 'all') return null;
  if (scope === 'current') return state.selectedComponentId == null ? new Set() : new Set([String(state.selectedComponentId)]);
  const ids = (state.mappingData?.componentSummaries || [])
    .filter((summary) => summary.componentId != null)
    .map((summary) => String(summary.componentId));
  return new Set(ids);
}
function buildCurrentCadAudit(scope = state.cadInspector.scope) {
  return buildCadNameAudit(state.xmlData, state.cadInspector.renames, {
    maxLength: state.cadInspector.maxLength,
    componentIds: cadInspectorComponentIds(scope),
  });
}
function cadIssueLabel(issue) {
  return ({ duplicate: 'ชื่อซ้ำ', 'too-long': 'เกินความยาว', blank: 'ชื่อว่าง' })[issue] || issue;
}
function cadInspectorFilteredItems(audit) {
  const filter = state.cadInspector.filter;
  const search = state.cadInspector.search.trim().toLowerCase();
  return audit.items.filter((item) => {
    if (filter === 'issues' && item.valid) return false;
    if (filter === 'duplicate' && !item.issues.includes('duplicate')) return false;
    if (filter === 'too-long' && !item.issues.includes('too-long')) return false;
    if (filter === 'blank' && !item.issues.includes('blank')) return false;
    if (filter === 'changed' && !item.changed) return false;
    if (filter === 'valid' && !item.valid) return false;
    if (!search) return true;
    return [item.componentName, item.packageName, item.globalId, item.localIndex, item.originalName, item.proposedName]
      .some((value) => String(value ?? '').toLowerCase().includes(search));
  });
}
function renderCadInspectorTable() {
  const audit = state.cadInspector.audit || buildCurrentCadAudit();
  const items = cadInspectorFilteredItems(audit);
  const pages = Math.max(1, Math.ceil(items.length / state.cadInspector.pageSize));
  state.cadInspector.page = Math.max(1, Math.min(pages, state.cadInspector.page));
  const start = (state.cadInspector.page - 1) * state.cadInspector.pageSize;
  const shown = items.slice(start, start + state.cadInspector.pageSize);
  els.cadInspectorTableBody.innerHTML = '';

  for (const item of shown) {
    const row = document.createElement('tr');
    row.className = item.valid ? 'cad-valid-row' : 'cad-invalid-row';
    const componentCell = document.createElement('td');
    const componentName = document.createElement('strong'); componentName.textContent = item.componentName;
    const componentMeta = document.createElement('small'); componentMeta.textContent = item.packageName || '—';
    componentCell.append(componentName, document.createElement('br'), componentMeta);
    const localCell = document.createElement('td'); localCell.textContent = item.localIndex ?? '—';
    const idCell = document.createElement('td'); idCell.textContent = item.globalId ?? '—';
    const originalCell = document.createElement('td'); originalCell.className = 'cad-name-original'; originalCell.textContent = item.originalName || '(ว่าง)';
    const finalCell = document.createElement('td');
    const input = document.createElement('input'); input.className = `cad-name-input${item.valid ? '' : ' invalid'}`; input.value = item.proposedName; input.dataset.key = item.key; input.autocomplete = 'off'; input.spellcheck = false;
    input.addEventListener('change', () => {
      const value = normalizeCadName(input.value).toUpperCase();
      if (value === item.originalName) state.cadInspector.renames.delete(item.key);
      else state.cadInspector.renames.set(item.key, value);
      refreshCadInspector();
    });
    finalCell.append(input);
    const lengthCell = document.createElement('td'); lengthCell.textContent = `${item.length}/${state.cadInspector.maxLength}`;
    const issueCell = document.createElement('td'); const issueList = document.createElement('div'); issueList.className = 'cad-issue-list';
    if (item.valid) { const chip = document.createElement('span'); chip.className = 'cad-issue-chip ok'; chip.textContent = 'ผ่าน'; issueList.append(chip); }
    for (const issue of item.issues) { const chip = document.createElement('span'); chip.className = `cad-issue-chip ${issue}`; chip.textContent = cadIssueLabel(issue); issueList.append(chip); }
    if (item.changed) { const chip = document.createElement('span'); chip.className = 'cad-issue-chip changed'; chip.textContent = 'แก้แล้ว'; issueList.append(chip); }
    issueCell.append(issueList);
    const actionCell = document.createElement('td'); const locate = document.createElement('button'); locate.type = 'button'; locate.className = 'cad-row-action'; locate.textContent = 'ดูตำแหน่ง'; locate.addEventListener('click', () => locateCadAuditItem(item)); actionCell.append(locate);
    row.append(componentCell, localCell, idCell, originalCell, finalCell, lengthCell, issueCell, actionCell);
    els.cadInspectorTableBody.append(row);
  }

  if (!shown.length) {
    const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 8; cell.className = 'empty-state'; cell.textContent = 'ไม่พบรายการตามตัวกรอง'; row.append(cell); els.cadInspectorTableBody.append(row);
  }
  els.cadInspectorTableSummary.textContent = `${formatInt.format(items.length)} รายการ · แสดง ${items.length ? formatInt.format(start + 1) : 0}–${formatInt.format(Math.min(start + shown.length, items.length))}`;
  els.cadInspectorPageLabel.textContent = `${state.cadInspector.page} / ${pages}`;
  els.cadInspectorPrevPage.disabled = state.cadInspector.page <= 1;
  els.cadInspectorNextPage.disabled = state.cadInspector.page >= pages;
}
function refreshCadInspector() {
  if (!state.xmlData) return;
  state.cadInspector.maxLength = Math.max(2, Number(els.cadMaxLength.value) || 5);
  state.cadInspector.prefix = String(els.cadNamePrefix.value || 'L').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, Math.max(1, state.cadInspector.maxLength - 1)) || 'L';
  els.cadNamePrefix.value = state.cadInspector.prefix;
  state.cadInspector.scope = els.cadInspectorScope.value;
  state.cadInspector.filter = els.cadIssueFilter.value;
  state.cadInspector.search = els.cadInspectorSearch.value;
  const audit = buildCurrentCadAudit(); state.cadInspector.audit = audit;
  const summary = audit.summary;
  els.cadAuditTotal.textContent = formatInt.format(summary.total);
  els.cadAuditValid.textContent = formatInt.format(summary.valid);
  els.cadAuditUnresolved.textContent = formatInt.format(summary.unresolved);
  els.cadAuditDuplicateGroups.textContent = formatInt.format(summary.duplicateGroups);
  els.cadAuditDuplicateLands.textContent = formatInt.format(summary.duplicateLands);
  els.cadAuditTooLong.textContent = formatInt.format(summary.tooLong);
  els.cadAuditBlank.textContent = formatInt.format(summary.blank);
  els.cadAuditChanged.textContent = formatInt.format(summary.changed);
  const fullAudit = buildCurrentCadAudit('all');
  els.cadExportXmlButton.disabled = fullAudit.summary.unresolved > 0;
  els.cadExportXmlButton.title = fullAudit.summary.unresolved ? `ยังมีชื่อไม่ผ่าน ${fullAudit.summary.unresolved} จุดใน CAD` : 'พร้อมส่งออก XML';
  els.cadApplyNamesButton.disabled = state.cadInspector.renames.size === 0;
  els.cadResetNamesButton.disabled = state.cadInspector.renames.size === 0;
  els.cadInspectorMessage.textContent = fullAudit.summary.unresolved
    ? `ขอบเขตนี้ยังมีปัญหา ${formatInt.format(summary.unresolved)} จุด · ทั้ง CAD ยังไม่ผ่าน ${formatInt.format(fullAudit.summary.unresolved)} จุด จึงยัง Export XML ไม่ได้`
    : `CAD ผ่านการตรวจทั้งหมดแล้ว · ชื่อทุกจุดไม่ซ้ำภายใน Part และยาวไม่เกิน ${state.cadInspector.maxLength} ตัวอักษร`;
  renderCadInspectorTable();
}
function openCadInspector() {
  if (!state.xmlData) return toast('กรุณานำเข้า CAD XML ก่อน');
  els.cadInspectorScope.value = state.cadInspector.scope;
  els.cadMaxLength.value = state.cadInspector.maxLength;
  els.cadNamePrefix.value = state.cadInspector.prefix;
  els.cadIssueFilter.value = state.cadInspector.filter;
  els.cadInspectorSearch.value = state.cadInspector.search;
  state.cadInspector.page = 1;
  els.cadInspectorOverlay.classList.remove('hidden');
  refreshCadInspector();
}
function closeCadInspector() { els.cadInspectorOverlay.classList.add('hidden'); }
function generateCadNames(renameAll = false) {
  if (!state.xmlData) return;
  if (renameAll && !window.confirm('สร้างชื่อใหม่ให้ Land ทุกจุดในขอบเขตนี้ใช่หรือไม่? ชื่อเดิมจะยังอยู่ใน XML ต้นฉบับจนกว่าจะ Export')) return;
  try {
    const result = generateCadRenames(state.xmlData, state.cadInspector.renames, {
      maxLength: state.cadInspector.maxLength,
      prefix: state.cadInspector.prefix,
      renameAll,
      componentIds: cadInspectorComponentIds(),
    });
    state.cadInspector.renames = result.renames;
    state.cadInspector.page = 1;
    refreshCadInspector();
    toast(`สร้างชื่อที่ไม่ซ้ำแล้ว ${formatInt.format(result.generated)} จุด`);
  } catch (error) { toast(error.message, 5200); }
}
function applyCadNamesToProject({ silent = false } = {}) {
  if (!state.xmlData) return;
  const changedComponents = new Set();
  for (const component of state.xmlData.components) {
    for (const land of component.lands || []) {
      const key = cadLandKey(component.id, land.globalId);
      const original = land.originalCadName ?? land.cadName;
      if (state.cadInspector.renames.has(key)) {
        if (land.originalCadName == null) land.originalCadName = original;
        land.cadName = normalizeCadName(state.cadInspector.renames.get(key));
        changedComponents.add(component);
      } else if (land.originalCadName != null) {
        land.cadName = land.originalCadName;
        delete land.originalCadName;
        changedComponents.add(component);
      }
    }
  }
  for (const component of changedComponents) duplicateGroupCache.delete(component);
  if (state.mappingData) {
    for (const mapping of state.mappingData.mappings) {
      if (mapping.globalId == null || mapping.componentId == null) continue;
      const component = state.xmlData.componentById.get(String(mapping.componentId));
      const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(mapping.globalId));
      if (land) mapping.cadName = land.cadName;
    }
    for (const mapping of state.mappingData.mappings) {
      if (mapping.globalId == null || mapping.componentId == null) continue;
      const component = state.xmlData.componentById.get(String(mapping.componentId));
      const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(mapping.globalId));
      if (land) mapping.duplicateCadNameCount = duplicateCountForLand(land);
    }
  }
  saveActiveCadSession();
  if (canCompareCad()) rebuildCadComparison();
  refreshDuplicateControls(); renderTable(); draw(); updateStats();
  if (state.selected) selectMapping(state.selected, false);
  if (!silent) toast(`นำชื่อใหม่ไปใช้ในโปรเจกต์แล้ว ${formatInt.format(state.cadInspector.renames.size)} จุด`);
}
function resetCadNames() {
  if (!state.cadInspector.renames.size) return;
  if (!window.confirm('คืนชื่อ CAD ที่แก้ทั้งหมดกลับเป็นชื่อจากไฟล์ต้นฉบับใช่หรือไม่?')) return;
  state.cadInspector.renames.clear();
  applyCadNamesToProject({ silent: true });
  state.cadInspector.page = 1; refreshCadInspector(); toast('คืนชื่อเดิมแล้ว');
}
function locateCadAuditItem(item) {
  const component = state.xmlData?.componentById.get(String(item.componentId));
  const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(item.globalId));
  if (!component || !land) return;
  let option = [...els.componentSelect.options].find((candidate) => candidate.value === String(component.id));
  if (!option) { option = document.createElement('option'); option.value = String(component.id); option.textContent = `${component.name} · CAD Inspector · ${formatInt.format(component.lands.length)} lands`; els.componentSelect.append(option); }
  state.selectedComponentId = String(component.id); els.componentSelect.value = String(component.id); state.duplicateView.selectedName = '';
  closeCadInspector(); refreshDuplicateControls(); fitView(); selectLand(land); toast(`ตำแหน่ง ${component.name} / XML ID ${item.globalId}`);
}
function exportCadAuditReport() {
  const audit = buildCurrentCadAudit();
  const board = state.xmlData?.board?.Name || 'cad';
  downloadBlob(new Blob(['\ufeff', cadAuditToCsv(audit)], { type: 'text/csv;charset=utf-8' }), `${board}_cad_name_audit.csv`);
}
function exportCorrectedCadXml() {
  if (!state.xmlData || !state.xmlText) return;
  const fullAudit = buildCurrentCadAudit('all');
  if (fullAudit.summary.unresolved) {
    state.cadInspector.scope = 'all'; state.cadInspector.filter = 'issues'; state.cadInspector.page = 1;
    els.cadInspectorScope.value = 'all'; els.cadIssueFilter.value = 'issues'; refreshCadInspector();
    return toast(`ยัง Export ไม่ได้: CAD มีชื่อไม่ผ่าน ${formatInt.format(fullAudit.summary.unresolved)} จุด`, 5200);
  }
  const output = rewriteCadXml(state.xmlText, state.cadInspector.renames);
  const original = state.fileNames.xml || 'cad.xml';
  const stem = original.replace(/\.xml$/i, '');
  downloadBlob(new Blob([output], { type: 'application/xml;charset=utf-8' }), `${stem}_cad_checked.xml`);
  toast(`Export CAD XML สำเร็จ · แก้ชื่อ ${formatInt.format(state.cadInspector.renames.size)} จุด`);
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
  return duplicateGroupsForComponent(component).get(String(land.cadName).trim())?.length || 1;
}
const duplicateGroupCache = new WeakMap();
function duplicateGroupsForComponent(component = currentComponent()) {
  if (!component) return new Map();
  const cached = duplicateGroupCache.get(component);
  if (cached) return cached;
  const all = new Map();
  for (const land of component.lands || []) {
    const name = String(land.cadName || '').trim();
    if (!name) continue;
    if (!all.has(name)) all.set(name, []);
    all.get(name).push(land);
  }
  const duplicates = new Map([...all].filter(([, lands]) => lands.length > 1).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
  duplicateGroupCache.set(component, duplicates);
  return duplicates;
}
function selectedDuplicateLands() {
  return duplicateGroupsForComponent().get(state.duplicateView.selectedName) || [];
}
function setSelectedDuplicateName(name, { fit = false, selectFirst = false } = {}) {
  const groups = duplicateGroupsForComponent();
  state.duplicateView.selectedName = groups.has(name) ? name : '';
  if (els.duplicateNameSelect) els.duplicateNameSelect.value = state.duplicateView.selectedName;
  renderDuplicatePanel();
  if (selectFirst && state.duplicateView.selectedName) {
    const first = groups.get(state.duplicateView.selectedName)?.[0];
    if (first) selectLand(first);
  }
  if (fit && state.duplicateView.selectedName) fitDuplicateGroup();
  else draw();
}
function refreshDuplicateControls() {
  const groups = duplicateGroupsForComponent();
  const current = groups.has(state.duplicateView.selectedName) ? state.duplicateView.selectedName : '';
  state.duplicateView.selectedName = current;
  els.duplicateNameSelect.innerHTML = '';
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = groups.size ? `— เลือกจาก ${formatInt.format(groups.size)} ชื่อซ้ำ —` : '— ไม่พบชื่อซ้ำ —'; els.duplicateNameSelect.append(placeholder);
  for (const [name, lands] of groups) { const option = document.createElement('option'); option.value = name; option.textContent = `${name} · ${formatInt.format(lands.length)} ตำแหน่ง`; els.duplicateNameSelect.append(option); }
  els.duplicateNameSelect.value = current;
  els.duplicateNameSelect.disabled = groups.size === 0;
  els.duplicateToggle.disabled = groups.size === 0;
  els.duplicateOnlyToggle.disabled = groups.size === 0 || !state.duplicateView.enabled;
  const duplicateLandCount = [...groups.values()].reduce((sum, lands) => sum + lands.length, 0);
  els.duplicateSummaryMini.textContent = groups.size ? `${formatInt.format(groups.size)} ชื่อซ้ำ · รวม ${formatInt.format(duplicateLandCount)} ตำแหน่งใน ${currentComponent()?.name || 'Part'}` : 'ไม่พบชื่อ CAD ซ้ำใน Part นี้';
  renderDuplicatePanel();
}
function renderDuplicatePanel() {
  const groups = duplicateGroupsForComponent();
  const name = state.duplicateView.selectedName;
  const lands = groups.get(name) || [];
  els.duplicateGroupCount.textContent = formatInt.format(groups.size);
  els.duplicatePositionList.innerHTML = '';
  els.fitDuplicateButton.disabled = lands.length === 0;
  els.clearDuplicateButton.disabled = lands.length === 0;
  if (!groups.size) {
    els.duplicatePanelMessage.textContent = 'ไม่พบชื่อ CAD ซ้ำใน Part ที่เลือก';
    els.duplicatePositionList.innerHTML = '<p class="empty-state">ไม่มีตำแหน่งซ้ำ</p>';
    return;
  }
  if (!lands.length) {
    els.duplicatePanelMessage.textContent = `พบ ${formatInt.format(groups.size)} ชื่อซ้ำ เลือก Land หรือชื่อจากเมนูด้านซ้ายเพื่อดูตำแหน่งทั้งหมด`;
    els.duplicatePositionList.innerHTML = '<p class="empty-state">ยังไม่ได้เลือกกลุ่มชื่อซ้ำ</p>';
    return;
  }
  els.duplicatePanelMessage.textContent = `${name} พบซ้ำ ${formatInt.format(lands.length)} ตำแหน่ง เส้นประบนกราฟิกเชื่อมตำแหน่งในกลุ่มเดียวกัน`;
  const byGlobal = mappingByGlobalId();
  lands.forEach((land, index) => {
    const mapping = byGlobal.get(Number(land.globalId));
    const button = document.createElement('button'); button.type = 'button'; button.className = 'duplicate-position-item';
    if (state.selected && Number(state.selected.globalId) === Number(land.globalId)) button.classList.add('active');
    const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = `${name} · XML ${land.globalId}`;
    const meta = document.createElement('span'); meta.textContent = `X ${formatFloat.format(land.centerX)} · Y ${formatFloat.format(land.centerY)}${mapping ? ` · X-ray ${mapping.localIndex}` : ' · ไม่มีข้อมูลดิบ'}`;
    text.append(title, meta); const badge = document.createElement('i'); badge.className = 'duplicate-position-index'; badge.textContent = String(index + 1); button.append(text, badge);
    button.addEventListener('click', () => { selectLand(land); centerOn(land.centerX, land.centerY); });
    els.duplicatePositionList.append(button);
  });
}
function normalizeMappings() {
  for (const mapping of state.mappingData?.mappings || []) {
    if (mapping.anchorLocked == null) mapping.anchorLocked = false;
    if (!mapping.mappingMethod) mapping.mappingMethod = mapping.mapped ? 'auto-order-guess' : 'unmapped';
    if (mapping.alias == null) mapping.alias = '';
    mapping.verified = isVerifiedMapping(mapping);
    if (!mapping.verified && mapping.mapped && !mapping.mappingMethod) mapping.mappingMethod = 'auto-order-guess';
  }
  recomputeStats();
}
function recomputeStats() {
  if (!state.mappingData) return;
  const mappings = state.mappingData.mappings;
  state.mappingData.stats = {
    total: mappings.length,
    mapped: mappings.filter((m) => m.mapped).length,
    verified: mappings.filter(isVerifiedMapping).length,
    unverified: mappings.filter((m) => m.mapped && !isVerifiedMapping(m)).length,
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
  recomputeStats(); updateStats(); updateDetails(); updateEditPanel(); renderTable(); renderTeachPanel(); renderDuplicatePanel(); draw(); renderHistogram(); refreshHistoryButtons();
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
  if (!state.xmlData) { state.selectedComponentId = null; return; }
  const summaries = state.mappingData?.componentSummaries || [];
  const matched = [];

  if (summaries.length) {
    const seen = new Set();
    for (const summary of summaries) {
      if (summary.componentId == null || seen.has(String(summary.componentId))) continue;
      seen.add(String(summary.componentId)); matched.push(summary);
      const option = document.createElement('option'); option.value = String(summary.componentId);
      option.textContent = `${summary.componentName || `ID ${summary.componentId}`} · Raw ${formatInt.format(summary.xrayCount)} / CAD ${formatInt.format(summary.xmlCount)} lands · ${summary.packageName || summary.cadPackageName || 'ไม่ทราบ package'}`;
      els.componentSelect.append(option);
    }
    for (const summary of summaries.filter((item) => item.componentId == null)) {
      const option = document.createElement('option'); option.disabled = true;
      option.textContent = `${summary.componentName || 'ไม่ทราบชื่อ'} · ไม่พบ Part นี้ใน CAD · Raw ${formatInt.format(summary.xrayCount)} lands`;
      els.componentSelect.append(option);
    }
    const allowedIds = new Set(matched.map((summary) => String(summary.componentId)));
    const countMatchFirst = matched.find((summary) => summary.countMatch)?.componentId;
    const chosenCandidate = preferredId ?? countMatchFirst ?? matched[0]?.componentId ?? null;
    const chosen = chosenCandidate != null && allowedIds.has(String(chosenCandidate)) ? String(chosenCandidate) : (matched[0] ? String(matched[0].componentId) : null);
    state.selectedComponentId = chosen; if (chosen != null) els.componentSelect.value = chosen;
  } else {
    const components = state.xmlData.components.filter((component) => component.lands?.length)
      .sort((a, b) => (b.lands?.length || 0) - (a.lands?.length || 0) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
    for (const component of components) {
      const option = document.createElement('option'); option.value = String(component.id);
      option.textContent = `${component.name || `ID ${component.id}`} · ${formatInt.format(component.lands.length)} lands · ${component.packageName || 'ไม่ทราบ package'}`;
      els.componentSelect.append(option);
    }
    const allowed = new Set(components.map((component) => String(component.id)));
    const chosen = preferredId != null && allowed.has(String(preferredId)) ? String(preferredId) : (components[0] ? String(components[0].id) : null);
    state.selectedComponentId = chosen; if (chosen != null) els.componentSelect.value = chosen;
  }
  refreshDuplicateControls();
}
function updateStats() {
  const stats = state.mappingData?.stats;
  els.mappedStat.textContent = formatInt.format(stats?.mapped || 0);
  els.verifiedStat.textContent = formatInt.format(stats?.verified || 0);
  els.unmappedStat.textContent = formatInt.format(stats?.unmapped || 0);
  const summaries = state.mappingData?.componentSummaries || [];
  if (summaries.length) {
    const shownComponentIds = [...new Set(summaries.filter((item) => item.componentId != null).map((item) => String(item.componentId)))];
    const shownCadLands = shownComponentIds.reduce((sum, id) => sum + (state.xmlData?.componentById.get(id)?.lands.length || 0), 0);
    els.xmlLandStat.textContent = formatInt.format(shownCadLands);
    els.componentStat.textContent = formatInt.format(summaries.length);
  } else {
    els.xmlLandStat.textContent = formatInt.format(state.xmlData?.totalLands || 0);
    els.componentStat.textContent = formatInt.format(state.xmlData?.components.filter((component) => component.lands?.length).length || 0);
  }
  const summary = summaries.find((item) => String(item.componentId) === String(state.selectedComponentId)) || summaries[0];
  const anchors = currentMappings().filter((mapping) => mapping.anchorLocked).length;
  if (summary?.countMatch) {
    els.mappingFormula.innerHTML = `Component ${summary.componentName}: พบจำนวน Land ตรงกัน แต่ลำดับ XML เป็นเพียง Auto guess<br>Confirmed ${formatInt.format(stats?.verified || 0)} จุด · Anchor ${formatInt.format(anchors)} จุด`;
  } else if (summary) els.mappingFormula.textContent = `จำนวนไม่ตรงกัน: X-ray ${summary.xrayCount} / XML ${summary.xmlCount} · ต้องยืนยันด้วย Edit Mode`;
  else if (state.xmlData) els.mappingFormula.textContent = `${cadRoleLabel(state.activeCadRole)} เปิดแบบ CAD Viewer · เพิ่ม XLSX เมื่อต้องการ Mapping กับข้อมูลดิบ`;
  else els.mappingFormula.textContent = 'ยังไม่มีสูตร Mapping';
  const ready = Boolean(state.xmlData && state.xlsxData && state.mappingData);
  if (ready) els.projectStatus.textContent = `${cadRoleLabel(state.activeCadRole)} · ${formatInt.format(stats.verified || 0)} confirmed · ${formatInt.format(stats.unverified || 0)} unverified`;
  else if (state.xmlData) els.projectStatus.textContent = `${cadRoleLabel(state.activeCadRole)} · ${formatInt.format(state.xmlData.totalLands)} lands`;
  else els.projectStatus.textContent = 'ยังไม่ได้เปิดโปรเจกต์';
  els.projectStatus.className = `status-pill ${state.xmlData ? 'ready' : 'muted'}`;
  els.remapButton.disabled = !state.xmlData || !state.xlsxData;
  els.cadInspectorButton.disabled = !state.xmlData;
  els.exportCsvButton.disabled = !ready; els.exportExcelButton.disabled = !state.xmlData; els.exportJsonButton.disabled = !state.xmlData; els.restoreButton.disabled = !state.xmlData; els.teachButton.disabled = !ready;
  els.manualButton.disabled = !ready;
  populateActiveCadSelect(); updateCadCompareControls(); refreshHistoryButtons();
}
function runMapping() {
  if (!state.xmlData || !state.xlsxData) return;
  const hasManual = state.mappingData?.mappings.some((m) => m.manual || m.anchorLocked);
  if (hasManual && !window.confirm('คำนวณ Mapping ใหม่จะล้าง Manual mapping และ Anchor ทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) return;
  state.schema = readSchemaControls(); state.mappingData = buildMappings(state.xmlData, state.xlsxData, state.schema); normalizeMappings(); resetHistogramState();
  state.undoStack = []; state.redoStack = []; state.preview = null;
  const firstMapped = state.mappingData.mappings.find((mapping) => mapping.mapped);
  populateComponents(firstMapped?.componentId || state.selectedComponentId); state.page = 1;
  updateStats(); renderTable(); renderTeachPanel(); fitView(); draw(); renderHistogram();
  toast(`จับคู่สำเร็จ ${formatInt.format(state.mappingData.stats.mapped)} จาก ${formatInt.format(state.mappingData.stats.total)} รายการ`);
}
async function processFile(file, cadRole = 'auto') {
  if (!file) return;
  setLoading(true, `กำลังเปิด ${file.name}…`); await nextFrame();
  try {
    const project = await extractProjectFiles(file);
    let importedRole = null;
    if (project.xmlText) {
      importedRole = cadRole === 'generated' ? 'generated' : 'original';
      els.importMessage.textContent = `กำลังอ่าน ${cadRoleLabel(importedRole)}…`; await nextFrame();
      storeCadFile(importedRole, project.xmlText, project.names.xml || file.name);
    }
    if (project.xlsxBuffer) {
      state.xlsxBuffer = project.xlsxBuffer; state.fileNames.xlsx = project.names.xlsx || file.name;
      els.importMessage.textContent = 'กำลังอ่านตารางผล X-ray จาก XLSX…'; await nextFrame();
      state.xlsxData = await parseXlsx(project.xlsxBuffer);
    }
    syncCadFileLabels();

    if (importedRole) {
      const shouldActivate = !state.activeCadRole || state.activeCadRole === importedRole || importedRole === 'original' || !state.cadFiles.original;
      if (shouldActivate) activateCad(importedRole, { rebuild: true, fit: true });
      else if (state.xlsxData && state.xmlData) rebuildMappingForActiveCad();
    } else if (state.xmlData && state.xlsxData) {
      rebuildMappingForActiveCad(); populateComponents(state.selectedComponentId); fitView();
    }

    if (canCompareCad()) {
      rebuildCadComparison();
      const summary = state.cadCompare.result.summary;
      els.importMessage.textContent = `พร้อมเปรียบเทียบ Original ↔ Generated · จับคู่ ${formatInt.format(summary.matchedLands)} Land · เปลี่ยนชื่อ ${formatInt.format(summary.renamed + summary.renamedMoved)} จุด`;
      if (importedRole === 'generated') openCadCompare();
    } else if (state.xmlData && state.xlsxData && state.mappingData) {
      const summaries = state.mappingData.componentSummaries;
      const matchedParts = summaries.filter((summary) => summary.matched).length;
      const exactParts = summaries.filter((summary) => summary.countMatch).length;
      const missingParts = summaries.length - matchedParts;
      els.importMessage.textContent = `พบข้อมูลดิบ ${formatInt.format(summaries.length)} Part · จับคู่กับ CAD ได้ ${formatInt.format(matchedParts)} Part · จำนวน Land ตรงกัน ${formatInt.format(exactParts)} Part${missingParts ? ` · ไม่พบใน CAD ${formatInt.format(missingParts)} Part` : ''}`;
    } else if (state.xmlData) {
      els.importMessage.textContent = `เปิด ${cadRoleLabel(state.activeCadRole)} แล้ว · แสดง CAD ได้ทันทีโดยไม่ต้องมี XLSX`;
    } else if (state.xlsxData) els.importMessage.textContent = 'เปิด XLSX แล้ว กรุณาเลือก Original CAD เพิ่ม';

    populateComponents(state.selectedComponentId); updateStats(); renderTable(); renderTeachPanel(); refreshDuplicateControls(); draw(); renderHistogram();
  } catch (error) {
    console.error(error); els.importMessage.textContent = `เกิดข้อผิดพลาด: ${error.message}`; toast(error.message, 5200);
  } finally {
    setLoading(false); els.projectFile.value = ''; els.originalCadFile.value = ''; els.generatedCadFile.value = '';
  }
}
function resetProject() {
  Object.assign(state, {
    xmlText: null, xlsxBuffer: null, xmlData: null, xlsxData: null, schema: null, mappingData: null,
    selectedComponentId: null, selected: null, hoveredLand: null, manualMode: false, preview: null,
    edit: { enabled: false, autoNext: true, lockConfirmed: true }, undoStack: [], redoStack: [], page: 1,
    fileNames: { xml: '', generatedXml: '', xlsx: '' }, cadFiles: { original: null, generated: null }, activeCadRole: null,
    cadCompare: { result: null, tolerance: 0.08, filter: 'changed', search: '', page: 1, pageSize: 120, selectedRow: null, overlayEnabled: false },
    view: { scale: 1, offsetX: 0, offsetY: 0 }, dragStart: null,
    duplicateView: { enabled: true, dimOthers: false, selectedName: '' },
    cadInspector: { renames: new Map(), maxLength: 5, prefix: 'L', scope: 'all', filter: 'issues', search: '', page: 1, pageSize: 120, audit: null },
  });
  resetHistogramState();
  for (const overlay of [els.histogramOverlay, els.cadInspectorOverlay, els.cadCompareOverlay, els.componentReportOverlay, els.teachOverlay]) overlay.classList.add('hidden');
  els.duplicateToggle.checked = true; els.duplicateOnlyToggle.checked = false; els.cadCompareOverlayToggle.checked = false;
  syncCadFileLabels(); els.importMessage.textContent = 'ไฟล์จะถูกประมวลผลในเครื่อง ไม่อัปโหลดไปยังเซิร์ฟเวอร์';
  for (const select of [els.componentColumn, els.packageColumn, els.landColumn, els.measurementColumn, els.componentSelect, els.activeCadSelect]) select.innerHTML = '';
  els.mappingTableBody.innerHTML = ''; clearDetails(); refreshDuplicateControls(); renderTeachPanel(); updateEditPanel(); updateStats(); renderCadCompare(); draw(); renderHistogram();
}
function filteredMappings() {
  const mappings = currentMappings();
  switch (state.filter) {
    case 'duplicate': return mappings.filter((m) => m.duplicateCadNameCount > 1);
    case 'verified': return mappings.filter(isVerifiedMapping);
    case 'unverified': return mappings.filter((m) => m.mapped && !isVerifiedMapping(m));
    case 'unmapped': return mappings.filter((m) => !m.mapped);
    default: return mappings;
  }
}
function mappingStatus(mapping) {
  if (!mapping.mapped) return { text: 'Unmapped', cls: 'unmapped' };
  if (isVerifiedMapping(mapping)) return { text: mapping.anchorLocked ? 'Confirmed' : 'Verified', cls: 'verified' };
  return { text: 'Unverified', cls: 'unverified' };
}
function renderTable() {
  const all = filteredMappings(); const pages = Math.max(1, Math.ceil(all.length / state.pageSize)); state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * state.pageSize; const rows = all.slice(start, start + state.pageSize);
  const previewMappings = new Set(state.preview?.proposals.map((p) => p.mapping) || []); els.mappingTableBody.innerHTML = ''; const fragment = document.createDocumentFragment();
  for (const mapping of rows) {
    const tr = document.createElement('tr'); if (state.selected === mapping) tr.classList.add('active'); if (isVerifiedMapping(mapping)) tr.classList.add('verified-row'); else if (mapping.mapped) tr.classList.add('unverified-row'); if (previewMappings.has(mapping)) tr.classList.add('preview-row');
    const values = [mapping.localIndex, mapping.globalId, mapping.alias || mapping.cadName || 'Unmapped', Number.isFinite(mapping.centerX) ? formatFloat.format(mapping.centerX) : '—', Number.isFinite(mapping.centerY) ? formatFloat.format(mapping.centerY) : '—', mapping.measurement ?? '—', `${mapping.confidence ?? 0}%`];
    for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
    const status = mappingStatus(mapping); const statusTd = document.createElement('td'); const chip = document.createElement('span'); chip.className = `status-chip ${status.cls}`; chip.textContent = status.text; statusTd.append(chip); tr.append(statusTd);
    tr.addEventListener('click', () => selectMapping(mapping, true)); fragment.append(tr);
  }
  els.mappingTableBody.append(fragment); els.tableSummary.textContent = `${formatInt.format(all.length)} รายการ`; els.pageLabel.textContent = `${state.page} / ${pages}`; els.prevPage.disabled = state.page <= 1; els.nextPage.disabled = state.page >= pages;
}
function selectMapping(mapping, center = false) {
  state.selected = mapping; if (!state.edit.enabled) { state.manualMode = false; els.manualBanner.classList.add('hidden'); els.manualBanner.classList.remove('preview-active'); }
  if (mapping.componentId != null && String(mapping.componentId) !== String(state.selectedComponentId)) { state.selectedComponentId = String(mapping.componentId); els.componentSelect.value = String(mapping.componentId); state.duplicateView.selectedName = ''; refreshDuplicateControls(); fitView(); }
  if (mapping.duplicateCadNameCount > 1 && mapping.cadName) { state.duplicateView.selectedName = String(mapping.cadName).trim(); els.duplicateNameSelect.value = state.duplicateView.selectedName; }
  updateDetails(); updateEditPanel(); renderDuplicatePanel(); renderTable(); if (center && Number.isFinite(mapping.centerX) && Number.isFinite(mapping.centerY)) centerOn(mapping.centerX, mapping.centerY); draw(); renderHistogram();
}
function clearDetails() {
  state.selected = null; els.selectedTitle.textContent = 'ยังไม่ได้เลือก'; els.selectedSubTitle.textContent = 'ค้นหาหรือคลิกตำแหน่งบนกราฟิก';
  for (const el of [els.dLocal, els.dGlobal, els.dCad, els.dComponent, els.dX, els.dY, els.dMeasurement, els.dConfidence, els.dRow, els.dMethod, els.dVerified, els.dAnchor]) el.textContent = '—';
  els.rawData.textContent = '—'; els.aliasInput.value = ''; els.aliasInput.disabled = true; els.saveAliasButton.disabled = true; els.copyRawButton.disabled = true; els.duplicateWarning.classList.add('hidden');
  for (const button of [els.anchorButton, els.unmapButton, els.nudgePrevButton, els.nudgeNextButton]) button.disabled = true;
  updateEditPanel();
}
function updateDetails() {
  const mapping = state.selected; if (!mapping) return clearDetails();
  els.selectedTitle.textContent = mapping.alias || mapping.cadName || `Land ${mapping.localIndex}`; els.selectedSubTitle.textContent = `${mapping.componentName || 'Unknown component'} · ${mapping.packageName || 'Unknown package'}`;
  els.dLocal.textContent = mapping.localIndex ?? '—'; els.dGlobal.textContent = mapping.globalId ?? '—'; els.dCad.textContent = mapping.cadName || '—'; els.dComponent.textContent = mapping.componentName || '—';
  els.dX.textContent = Number.isFinite(mapping.centerX) ? `${formatFloat.format(mapping.centerX)} mm` : '—'; els.dY.textContent = Number.isFinite(mapping.centerY) ? `${formatFloat.format(mapping.centerY)} mm` : '—';
  els.dMeasurement.textContent = mapping.measurement ?? '—'; els.dConfidence.textContent = `${mapping.confidence ?? 0}%${mapping.manual ? ' · manual' : ''}`; els.dRow.textContent = mapping.sourceRow ?? '—';
  els.dMethod.textContent = mapping.mappingMethod || (mapping.manual ? 'manual' : 'auto'); els.dVerified.textContent = isVerifiedMapping(mapping) ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'; els.dAnchor.textContent = mapping.anchorLocked ? 'ล็อกแล้ว' : 'ไม่ล็อก';
  els.aliasInput.disabled = false; els.saveAliasButton.disabled = false; els.copyRawButton.disabled = !mapping.raw; els.aliasInput.value = mapping.alias || '';
  els.rawData.textContent = mapping.raw ? mapping.raw.map((value, index) => `${columnName(index)}: ${value ?? ''}`).join('\n') : JSON.stringify(mapping, null, 2);
  if (mapping.duplicateCadNameCount > 1) { state.duplicateView.selectedName = String(mapping.cadName || '').trim(); els.duplicateNameSelect.value = state.duplicateView.selectedName; els.duplicateWarning.textContent = `ชื่อ CAD ${mapping.cadName} พบซ้ำ ${mapping.duplicateCadNameCount} ตำแหน่ง ระบบไฮไลต์ทุกตำแหน่งบนกราฟิกและเชื่อมด้วยเส้นประ`; els.duplicateWarning.classList.remove('hidden'); }
  else els.duplicateWarning.classList.add('hidden');
  els.manualButton.disabled = !state.mappingData; els.anchorButton.disabled = !state.mappingData || !mapping.mapped; els.anchorButton.textContent = mapping.anchorLocked ? 'ปลด Anchor' : 'ล็อกเป็น Anchor'; els.unmapButton.disabled = !state.mappingData || !mapping.mapped; els.nudgePrevButton.disabled = !state.mappingData || !mapping.mapped; els.nudgeNextButton.disabled = !state.mappingData || !mapping.mapped;
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
function fitLands(lands, paddingWorld = 1.2) {
  if (!lands?.length || !els.canvas.clientWidth || !els.canvas.clientHeight) return;
  const xs = lands.map((land) => Number(land.centerX)).filter(Number.isFinite);
  const ys = lands.map((land) => Number(land.centerY)).filter(Number.isFinite);
  if (!xs.length || !ys.length) return;
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
  if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  minX -= paddingWorld; maxX += paddingWorld; minY -= paddingWorld; maxY += paddingWorld;
  const pad = 42; const width = Math.max(0.4, maxX - minX); const height = Math.max(0.4, maxY - minY);
  state.view.scale = Math.max(0.25, Math.min(450, (els.canvas.clientWidth - pad * 2) / width, (els.canvas.clientHeight - pad * 2) / height));
  state.view.offsetX = els.canvas.clientWidth / 2 - ((minX + maxX) / 2) * state.view.scale;
  state.view.offsetY = els.canvas.clientHeight / 2 + ((minY + maxY) / 2) * state.view.scale;
  draw();
}
function fitDuplicateGroup() {
  const lands = selectedDuplicateLands();
  if (!lands.length) return toast('ยังไม่ได้เลือกชื่อ CAD ซ้ำ');
  fitLands(lands, 1.6);
}
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
    if (!els.histogramOverlay.classList.contains('hidden')) renderDetailedHistogram();
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
  if (!els.histogramOverlay.classList.contains('hidden')) renderDetailedHistogram();
}

function measurementValues() {
  return currentMappings().map((mapping) => Number(mapping.measurement)).filter(Number.isFinite).sort((a, b) => a - b);
}
function quantile(sortedValues, q) {
  if (!sortedValues.length) return NaN;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
function histogramStats(sortedValues) {
  if (!sortedValues.length) return null;
  const average = sortedValues.reduce((sum, value) => sum + value, 0) / sortedValues.length;
  const variance = sortedValues.reduce((sum, value) => sum + ((value - average) ** 2), 0) / sortedValues.length;
  return {
    count: sortedValues.length,
    min: sortedValues[0],
    q1: quantile(sortedValues, 0.25),
    average,
    median: quantile(sortedValues, 0.5),
    q3: quantile(sortedValues, 0.75),
    max: sortedValues[sortedValues.length - 1],
    stdDev: Math.sqrt(variance),
  };
}
function clampHistogramRange(fullMin, fullMax, requestedMin, requestedMax) {
  let min = Number.isFinite(requestedMin) ? requestedMin : fullMin;
  let max = Number.isFinite(requestedMax) ? requestedMax : fullMax;
  min = Math.max(fullMin, Math.min(fullMax, min));
  max = Math.max(fullMin, Math.min(fullMax, max));
  if (min > max) [min, max] = [max, min];
  if (min === max && fullMin !== fullMax) {
    const padding = Math.max((fullMax - fullMin) / 200, Number.EPSILON);
    min = Math.max(fullMin, min - padding);
    max = Math.min(fullMax, max + padding);
  }
  return { min, max };
}
function buildDetailedHistogramModel() {
  const values = measurementValues();
  if (!values.length) return { values, bins: [], inRange: [] };
  const fullMin = values[0];
  const fullMax = values[values.length - 1];
  const requestedMin = state.histogram.rangeMin == null ? NaN : Number(state.histogram.rangeMin);
  const requestedMax = state.histogram.rangeMax == null ? NaN : Number(state.histogram.rangeMax);
  const active = clampHistogramRange(fullMin, fullMax, requestedMin, requestedMax);
  const rangeMin = state.histogram.rangeMin == null ? fullMin : active.min;
  const rangeMax = state.histogram.rangeMax == null ? fullMax : active.max;
  const inRange = values.filter((value) => value >= rangeMin && value <= rangeMax);
  const requestedBins = Math.max(5, Math.min(400, Number(els.detailedHistogramBins.value) || 50));
  const binCount = rangeMax === rangeMin ? 1 : requestedBins;
  const span = rangeMax - rangeMin || 1;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const low = rangeMin + span * (index / binCount);
    const high = index === binCount - 1 ? rangeMax : rangeMin + span * ((index + 1) / binCount);
    return { index, low, high, count: 0, cumulative: 0 };
  });
  for (const value of inRange) {
    const index = rangeMax === rangeMin ? 0 : Math.min(binCount - 1, Math.floor(((value - rangeMin) / span) * binCount));
    bins[index].count += 1;
  }
  let cumulative = 0;
  for (const bin of bins) { cumulative += bin.count; bin.cumulative = cumulative; }
  return { values, fullMin, fullMax, rangeMin, rangeMax, span, inRange, bins, stats: histogramStats(inRange) };
}
function formatHistogramRange(low, high, isLast = false) {
  return `${formatFloat.format(low)} ${isLast ? '≤ x ≤' : '≤ x <'} ${formatFloat.format(high)}`;
}
function updateSelectedBinDetails(model) {
  const bin = model.bins?.[state.histogram.selectedBin];
  els.zoomHistogramBinButton.disabled = !bin;
  if (!bin) {
    els.selectedBinRange.textContent = 'ยังไม่ได้เลือกแท่ง';
    els.selectedBinCount.textContent = '—';
    els.selectedBinPercent.textContent = '—';
    els.selectedBinCumulative.textContent = '—';
    return;
  }
  const denominator = model.inRange.length || 1;
  els.selectedBinRange.textContent = formatHistogramRange(bin.low, bin.high, bin.index === model.bins.length - 1);
  els.selectedBinCount.textContent = formatInt.format(bin.count);
  els.selectedBinPercent.textContent = `${formatFloat.format((bin.count / denominator) * 100)}%`;
  els.selectedBinCumulative.textContent = `${formatInt.format(bin.cumulative)} · ${formatFloat.format((bin.cumulative / denominator) * 100)}%`;
}
function renderDetailedHistogram() {
  const canvas = els.detailedHistogramCanvas;
  const hctx = detailedHistogramCtx;
  if (!canvas || !hctx) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = canvas.clientWidth || 920;
  const height = canvas.clientHeight || 560;
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hctx.clearRect(0, 0, width, height);
  hctx.fillStyle = '#0b1320';
  hctx.fillRect(0, 0, width, height);

  const component = currentComponent();
  const model = buildDetailedHistogramModel();
  els.detailedHistogramPart.textContent = component ? `${component.name} · ${component.packageName || 'Unknown package'} · Measurement ${formatInt.format(model.values.length)} ค่า` : 'เลือก Part เพื่อแสดงข้อมูล';
  els.detailHistTotal.textContent = formatInt.format(model.values.length);
  els.detailHistInRange.textContent = formatInt.format(model.inRange.length);
  if (!model.values.length) {
    for (const el of [els.detailHistMin, els.detailHistQ1, els.detailHistAverage, els.detailHistMedian, els.detailHistQ3, els.detailHistMax, els.detailHistStdDev]) el.textContent = '—';
    els.detailedHistogramMessage.textContent = component ? `${component.name}: ไม่พบ Measurement ที่เป็นตัวเลข` : 'เลือก Part ที่พบในข้อมูลดิบ';
    hctx.fillStyle = '#91a0b7'; hctx.font = '14px system-ui'; hctx.textAlign = 'center'; hctx.textBaseline = 'middle'; hctx.fillText('No numeric measurement data', width / 2, height / 2);
    state.histogram.layout = null; updateSelectedBinDetails(model); return;
  }

  const stat = model.stats;
  const display = (value) => Number.isFinite(value) ? formatFloat.format(value) : '—';
  els.detailHistMin.textContent = display(stat?.min); els.detailHistQ1.textContent = display(stat?.q1); els.detailHistAverage.textContent = display(stat?.average);
  els.detailHistMedian.textContent = display(stat?.median); els.detailHistQ3.textContent = display(stat?.q3); els.detailHistMax.textContent = display(stat?.max); els.detailHistStdDev.textContent = display(stat?.stdDev);
  if (document.activeElement !== els.histogramRangeMin) els.histogramRangeMin.value = state.histogram.rangeMin == null ? '' : String(model.rangeMin);
  if (document.activeElement !== els.histogramRangeMax) els.histogramRangeMax.value = state.histogram.rangeMax == null ? '' : String(model.rangeMax);

  const margin = { left: 68, right: 26, top: 34, bottom: 58 };
  const chartW = Math.max(1, width - margin.left - margin.right);
  const chartH = Math.max(1, height - margin.top - margin.bottom);
  const yMode = els.histogramYMode.value === 'percent' ? 'percent' : 'count';
  const denominator = model.inRange.length || 1;
  const barValues = model.bins.map((bin) => yMode === 'percent' ? (bin.count / denominator) * 100 : bin.count);
  const peak = Math.max(...barValues, yMode === 'percent' ? 0.01 : 1);

  hctx.strokeStyle = 'rgba(145,160,183,.18)'; hctx.lineWidth = 1;
  hctx.fillStyle = '#91a0b7'; hctx.font = '10px system-ui';
  for (let step = 0; step <= 5; step += 1) {
    const ratio = step / 5;
    const y = margin.top + chartH * ratio;
    hctx.beginPath(); hctx.moveTo(margin.left, y); hctx.lineTo(width - margin.right, y); hctx.stroke();
    const value = peak * (1 - ratio);
    hctx.textAlign = 'right'; hctx.textBaseline = 'middle'; hctx.fillText(yMode === 'percent' ? `${formatFloat.format(value)}%` : formatInt.format(Math.round(value)), margin.left - 8, y);
  }

  const slot = chartW / model.bins.length;
  const gap = Math.min(3, slot * 0.22);
  model.bins.forEach((bin, index) => {
    const value = barValues[index];
    const barH = (value / peak) * chartH;
    const ratio = model.bins.length === 1 ? 0.5 : index / (model.bins.length - 1);
    hctx.fillStyle = `hsl(${210 - ratio * 190} 78% 58%)`;
    hctx.globalAlpha = state.histogram.selectedBin == null || state.histogram.selectedBin === index ? 0.92 : 0.52;
    hctx.fillRect(margin.left + index * slot + gap / 2, margin.top + chartH - barH, Math.max(1, slot - gap), barH);
    hctx.globalAlpha = 1;
    if (state.histogram.selectedBin === index || state.histogram.hoveredBin === index) {
      hctx.strokeStyle = state.histogram.selectedBin === index ? '#ffffff' : '#56d6c5'; hctx.lineWidth = state.histogram.selectedBin === index ? 2 : 1.2;
      hctx.strokeRect(margin.left + index * slot + gap / 2, margin.top + chartH - barH, Math.max(1, slot - gap), Math.max(1, barH));
    }
  });

  hctx.fillStyle = '#91a0b7'; hctx.textBaseline = 'top';
  const xTickCount = Math.min(8, Math.max(2, Math.floor(chartW / 115)));
  for (let tick = 0; tick <= xTickCount; tick += 1) {
    const ratio = tick / xTickCount;
    const x = margin.left + chartW * ratio;
    const value = model.rangeMin + model.span * ratio;
    hctx.strokeStyle = 'rgba(145,160,183,.24)'; hctx.beginPath(); hctx.moveTo(x, margin.top + chartH); hctx.lineTo(x, margin.top + chartH + 5); hctx.stroke();
    hctx.textAlign = tick === 0 ? 'left' : tick === xTickCount ? 'right' : 'center'; hctx.fillText(display(value), x, margin.top + chartH + 9);
  }
  hctx.textAlign = 'center'; hctx.fillText('Measurement', margin.left + chartW / 2, height - 17);

  const selectedMeasurement = Number(state.selected?.measurement);
  if (Number.isFinite(selectedMeasurement) && selectedMeasurement >= model.rangeMin && selectedMeasurement <= model.rangeMax && String(state.selected?.componentId) === String(state.selectedComponentId)) {
    const ratio = model.rangeMax === model.rangeMin ? 0.5 : (selectedMeasurement - model.rangeMin) / model.span;
    const x = margin.left + ratio * chartW;
    hctx.strokeStyle = '#ffffff'; hctx.lineWidth = 1.5; hctx.setLineDash([5, 4]); hctx.beginPath(); hctx.moveTo(x, margin.top); hctx.lineTo(x, margin.top + chartH); hctx.stroke(); hctx.setLineDash([]);
    hctx.fillStyle = '#ffffff'; hctx.textAlign = x > width * 0.75 ? 'right' : 'left'; hctx.textBaseline = 'top'; hctx.fillText(`Selected ${display(selectedMeasurement)}`, x + (x > width * 0.75 ? -6 : 6), margin.top + 4);
  }

  if (state.histogram.drag) {
    const x1 = Math.max(margin.left, Math.min(margin.left + chartW, state.histogram.drag.startX));
    const x2 = Math.max(margin.left, Math.min(margin.left + chartW, state.histogram.drag.currentX));
    const left = Math.min(x1, x2); const selectionW = Math.abs(x2 - x1);
    hctx.fillStyle = 'rgba(43,167,255,.16)'; hctx.fillRect(left, margin.top, selectionW, chartH);
    hctx.strokeStyle = 'rgba(43,167,255,.9)'; hctx.lineWidth = 1; hctx.strokeRect(left, margin.top, selectionW, chartH);
    const low = model.rangeMin + ((left - margin.left) / chartW) * model.span;
    const high = model.rangeMin + (((left + selectionW) - margin.left) / chartW) * model.span;
    els.histogramSelectionLabel.textContent = `${display(low)} – ${display(high)}`; els.histogramSelectionLabel.classList.remove('hidden');
  } else els.histogramSelectionLabel.classList.add('hidden');

  state.histogram.layout = { ...model, margin, chartW, chartH, slot, width, height, yMode, peak };
  updateSelectedBinDetails(model);
  const binWidth = model.bins.length === 1 ? 0 : model.span / model.bins.length;
  els.detailedHistogramMessage.textContent = `${component?.name || 'Part'} · ช่วง ${display(model.rangeMin)} ถึง ${display(model.rangeMax)} · ${formatInt.format(model.inRange.length)} ค่า · ${model.bins.length} bins${binWidth ? ` · bin width ${display(binWidth)}` : ''}`;
}
function openDetailedHistogram() {
  els.histogramOverlay.classList.remove('hidden');
  requestAnimationFrame(() => { renderDetailedHistogram(); requestAnimationFrame(renderDetailedHistogram); });
}
function closeDetailedHistogram() {
  els.histogramOverlay.classList.add('hidden');
  els.histogramTooltip.classList.add('hidden');
  state.histogram.drag = null; state.histogram.hoveredBin = null;
}
function detailedHistogramPoint(event) {
  const rect = els.detailedHistogramCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function histogramValueAtX(x, layout = state.histogram.layout) {
  if (!layout) return NaN;
  const ratio = Math.max(0, Math.min(1, (x - layout.margin.left) / layout.chartW));
  return layout.rangeMin + ratio * layout.span;
}
function histogramBinAtPoint(point) {
  const layout = state.histogram.layout;
  if (!layout || point.x < layout.margin.left || point.x > layout.margin.left + layout.chartW || point.y < layout.margin.top || point.y > layout.margin.top + layout.chartH) return null;
  return Math.max(0, Math.min(layout.bins.length - 1, Math.floor((point.x - layout.margin.left) / layout.slot)));
}
function showDetailedHistogramTooltip(event, binIndex) {
  const layout = state.histogram.layout;
  const bin = layout?.bins?.[binIndex];
  if (!bin) { els.histogramTooltip.classList.add('hidden'); return; }
  const denominator = layout.inRange.length || 1;
  els.histogramTooltip.innerHTML = `<strong>${formatHistogramRange(bin.low, bin.high, bin.index === layout.bins.length - 1)}</strong><br>Count: ${formatInt.format(bin.count)}<br>Percent: ${formatFloat.format((bin.count / denominator) * 100)}%<br>Cumulative: ${formatInt.format(bin.cumulative)} (${formatFloat.format((bin.cumulative / denominator) * 100)}%)`;
  const rect = els.detailedHistogramCanvas.getBoundingClientRect();
  const wrapRect = els.detailedHistogramCanvas.parentElement.getBoundingClientRect();
  let left = event.clientX - wrapRect.left + 14; let top = event.clientY - wrapRect.top + 14;
  if (left + 250 > rect.width) left -= 265;
  if (top + 110 > rect.height) top -= 120;
  els.histogramTooltip.style.left = `${Math.max(6, left)}px`; els.histogramTooltip.style.top = `${Math.max(6, top)}px`; els.histogramTooltip.classList.remove('hidden');
}
function setHistogramRange(min, max) {
  const values = measurementValues();
  if (!values.length) return;
  const range = clampHistogramRange(values[0], values[values.length - 1], Number(min), Number(max));
  state.histogram.rangeMin = range.min; state.histogram.rangeMax = range.max; state.histogram.selectedBin = null; state.histogram.hoveredBin = null;
  renderDetailedHistogram(); draw();
}
function applyHistogramRangeFromInputs() {
  const values = measurementValues(); if (!values.length) return;
  const min = els.histogramRangeMin.value === '' ? values[0] : Number(els.histogramRangeMin.value);
  const max = els.histogramRangeMax.value === '' ? values[values.length - 1] : Number(els.histogramRangeMax.value);
  if (!Number.isFinite(min) || !Number.isFinite(max)) { toast('กรุณากรอกช่วง Measurement เป็นตัวเลข'); return; }
  setHistogramRange(min, max);
}
function resetHistogramRange() {
  state.histogram.rangeMin = null; state.histogram.rangeMax = null; state.histogram.selectedBin = null; state.histogram.hoveredBin = null; state.histogram.drag = null;
  els.histogramRangeMin.value = ''; els.histogramRangeMax.value = ''; renderDetailedHistogram(); draw();
}
function zoomToSelectedHistogramBin() {
  const layout = state.histogram.layout; const bin = layout?.bins?.[state.histogram.selectedBin]; if (!bin) return;
  setHistogramRange(bin.low, bin.high);
}
function exportHistogramCsv() {
  const model = buildDetailedHistogramModel(); if (!model.bins.length) { toast('ไม่มี Measurement สำหรับส่งออก'); return; }
  const denominator = model.inRange.length || 1;
  const rows = [['bin','lower_bound','upper_bound','count','percent','cumulative_count','cumulative_percent']];
  for (const bin of model.bins) rows.push([bin.index + 1, bin.low, bin.high, bin.count, (bin.count / denominator) * 100, bin.cumulative, (bin.cumulative / denominator) * 100]);
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const componentName = currentComponent()?.name || 'part';
  downloadBlob(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), `${componentName}_measurement_histogram.csv`);
}
function resetHistogramState() {
  state.histogram = { rangeMin: null, rangeMax: null, selectedBin: null, hoveredBin: null, layout: null, drag: null, filterEnabled: false };
  if (els.histogramCadFilter) els.histogramCadFilter.checked = false;
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
function comparisonRowsForCurrentComponent() {
  const result = state.cadCompare.result; const component = currentComponent();
  if (!result || !component) return [];
  return state.activeCadRole === 'generated'
    ? (result.byGeneratedComponentId.get(String(component.id)) || [])
    : (result.byOriginalComponentId.get(String(component.id)) || []);
}
function drawCadComparisonOverlay(width, height) {
  if (!state.cadCompare.overlayEnabled || !state.cadCompare.result) return;
  const rows = comparisonRowsForCurrentComponent(); if (!rows.length) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const row of rows) {
    const ox = Number(row.originalX), oy = Number(row.originalY), gx = Number(row.generatedX), gy = Number(row.generatedY);
    const hasOriginal = Number.isFinite(ox) && Number.isFinite(oy); const hasGenerated = Number.isFinite(gx) && Number.isFinite(gy);
    const originalPoint = hasOriginal ? worldToScreen(ox, oy) : null; const generatedPoint = hasGenerated ? worldToScreen(gx, gy) : null;
    const selected = state.cadCompare.selectedRow === row;
    if (originalPoint && generatedPoint && row.distance != null && Number(row.distance) > 0.001) {
      ctx.beginPath(); ctx.moveTo(originalPoint.x, originalPoint.y); ctx.lineTo(generatedPoint.x, generatedPoint.y);
      ctx.strokeStyle = selected ? 'rgba(255,255,255,.95)' : 'rgba(255,209,102,.62)'; ctx.lineWidth = selected ? 2 : 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (state.activeCadRole !== 'original' && originalPoint && originalPoint.x > -20 && originalPoint.x < width + 20 && originalPoint.y > -20 && originalPoint.y < height + 20) {
      ctx.beginPath(); ctx.arc(originalPoint.x, originalPoint.y, selected ? 7 : 4.5, 0, Math.PI * 2); ctx.strokeStyle = '#56d6c5'; ctx.lineWidth = selected ? 2.5 : 1.3; ctx.stroke();
    }
    if (state.activeCadRole !== 'generated' && generatedPoint && generatedPoint.x > -20 && generatedPoint.x < width + 20 && generatedPoint.y > -20 && generatedPoint.y < height + 20) {
      ctx.beginPath(); ctx.arc(generatedPoint.x, generatedPoint.y, selected ? 7 : 4.5, 0, Math.PI * 2); ctx.strokeStyle = '#ff75dc'; ctx.lineWidth = selected ? 2.5 : 1.3; ctx.stroke();
    }
    if (selected) {
      const labelPoint = state.activeCadRole === 'generated' ? originalPoint : generatedPoint;
      if (labelPoint) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(`${row.originalName || '—'} → ${row.generatedName || '—'}`, labelPoint.x + 9, labelPoint.y - 7); }
    }
  }
  ctx.restore();
}
function draw() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); const width = els.canvas.clientWidth || 1; const height = els.canvas.clientHeight || 1; const targetW = Math.round(width * dpr); const targetH = Math.round(height * dpr);
  if (els.canvas.width !== targetW || els.canvas.height !== targetH) { els.canvas.width = targetW; els.canvas.height = targetH; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#090f19'; ctx.fillRect(0, 0, width, height); drawGrid(width, height);
  const component = currentComponent();
  if (!component) { els.viewerTitle.textContent = 'ไม่มีข้อมูล'; els.viewerSubtitle.textContent = 'นำเข้าไฟล์เพื่อแสดงตำแหน่ง Land'; return; }
  const duplicateGroups = duplicateGroupsForComponent(component); const duplicateLandCount = [...duplicateGroups.values()].reduce((sum, lands) => sum + lands.length, 0);
  els.viewerTitle.textContent = `${component.name} · ${component.packageName || 'Unknown package'}`; els.viewerSubtitle.textContent = `${formatInt.format(component.lands.length)} lands · ชื่อซ้ำ ${formatInt.format(duplicateGroups.size)} กลุ่ม / ${formatInt.format(duplicateLandCount)} จุด · scale ${state.view.scale.toFixed(1)} px/mm${state.preview ? ' · Preview active' : ''}`;
  const byGlobal = mappingByGlobalId(); const previewByGlobal = previewStatusByGlobalId(); const current = currentMappings(); const measurements = current.map((m) => Number(m.measurement)).filter(Number.isFinite); const minMeasurement = measurements.length ? Math.min(...measurements) : 0; const maxMeasurement = measurements.length ? Math.max(...measurements) : 1;
  const histogramFilterActive = Boolean(state.histogram.filterEnabled && measurements.length);
  const histogramFilterMin = state.histogram.rangeMin == null ? minMeasurement : Number(state.histogram.rangeMin);
  const histogramFilterMax = state.histogram.rangeMax == null ? maxMeasurement : Number(state.histogram.rangeMax);
  if (component.bounds) { const p1 = worldToScreen(component.bounds.minX - 1, component.bounds.maxY + 1); const p2 = worldToScreen(component.bounds.maxX + 1, component.bounds.minY - 1); ctx.strokeStyle = 'rgba(86,214,197,.28)'; ctx.lineWidth = 1; ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y); }
  const showLabels = els.labelToggle.checked && state.view.scale >= 28; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '9px ui-monospace, monospace';
  const duplicateEnabled = state.duplicateView.enabled && duplicateGroups.size > 0;
  const selectedDuplicateGroup = duplicateEnabled ? (duplicateGroups.get(state.duplicateView.selectedName) || []) : [];
  if (selectedDuplicateGroup.length > 1) {
    const points = selectedDuplicateGroup.map((land) => worldToScreen(land.centerX, land.centerY)).filter((p) => p.x > -100 && p.x < width + 100 && p.y > -100 && p.y < height + 100);
    if (points.length > 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,209,102,.72)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for (const point of points.slice(1)) ctx.lineTo(point.x, point.y); ctx.stroke(); ctx.restore(); }
  }
  for (const land of component.lands) {
    const p = worldToScreen(land.centerX, land.centerY); if (p.x < -15 || p.x > width + 15 || p.y < -15 || p.y > height + 15) continue;
    const mapping = byGlobal.get(Number(land.globalId)); const previewStatus = previewByGlobal.get(Number(land.globalId)); const radius = Math.max(1.1, Math.min(8, (land.width || 0.5) * state.view.scale * 0.42));
    const duplicateGroup = duplicateGroups.get(String(land.cadName || '').trim()); const isDuplicate = Boolean(duplicateGroup); const isSelectedDuplicate = isDuplicate && String(land.cadName || '').trim() === state.duplicateView.selectedName;
    const measurement = Number(mapping?.measurement);
    const insideHistogramRange = !histogramFilterActive || (Number.isFinite(measurement) && measurement >= histogramFilterMin && measurement <= histogramFilterMax);
    let landAlpha = histogramFilterActive ? (insideHistogramRange ? (mapping ? (isVerifiedMapping(mapping) ? 0.98 : 0.58) : 0.28) : 0.07) : (mapping ? (isVerifiedMapping(mapping) ? 0.96 : 0.55) : 0.42);
    if (duplicateEnabled && state.duplicateView.dimOthers && !isDuplicate) landAlpha *= 0.1;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = measurementColor(mapping, minMeasurement, maxMeasurement); ctx.globalAlpha = landAlpha; ctx.fill(); ctx.globalAlpha = 1;
    if (histogramFilterActive && insideHistogramRange && mapping) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, radius + 1), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(86,214,197,.72)'; ctx.lineWidth = 0.9; ctx.stroke(); }
    if (previewStatus) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.5, radius + 1.5), 0, Math.PI * 2); ctx.strokeStyle = ['conflict', 'anchor-conflict', 'out-of-range'].includes(previewStatus) ? '#ff6b75' : '#2ba7ff'; ctx.globalAlpha = 0.72; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
    if (isVerifiedMapping(mapping)) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3.5, radius + 2.7), 0, Math.PI * 2); ctx.strokeStyle = mapping?.anchorLocked ? '#66e39f' : '#9ff2c0'; ctx.lineWidth = mapping?.anchorLocked ? 2 : 1.5; ctx.stroke(); }
    else if (mapping) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.8, radius + 1.6), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,189,91,.48)'; ctx.lineWidth = 0.9; ctx.stroke(); }
    if (duplicateEnabled && isDuplicate) {
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, radius + (isSelectedDuplicate ? 5 : 2.5)), 0, Math.PI * 2);
      ctx.strokeStyle = isSelectedDuplicate ? '#ffd166' : '#ff5bd3'; ctx.lineWidth = isSelectedDuplicate ? 2.4 : 1.35; ctx.stroke();
      if (!isSelectedDuplicate) { ctx.beginPath(); ctx.moveTo(p.x - 2.5, p.y - 2.5); ctx.lineTo(p.x + 2.5, p.y + 2.5); ctx.moveTo(p.x + 2.5, p.y - 2.5); ctx.lineTo(p.x - 2.5, p.y + 2.5); ctx.strokeStyle = '#ffb3eb'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    if (state.selected && Number(state.selected.globalId) === Number(land.globalId)) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(5, radius + 4), 0, Math.PI * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); }
    if ((showLabels && radius > 3) || (duplicateEnabled && isSelectedDuplicate)) { ctx.fillStyle = isSelectedDuplicate ? '#ffe39a' : '#d9e5f5'; ctx.fillText(land.cadName, p.x, p.y - Math.max(radius, 4) - (isSelectedDuplicate ? 5 : 2)); }
  }
  drawCadComparisonOverlay(width, height);
}
function findNearestLand(screenX, screenY) {
  const component = currentComponent(); if (!component) return null; const world = screenToWorld(screenX, screenY); const threshold = Math.max(0.35, 12 / state.view.scale); let best = null; let bestD2 = threshold * threshold;
  for (const land of component.lands) { const dx = land.centerX - world.x; const dy = land.centerY - world.y; const d2 = dx * dx + dy * dy; if (d2 < bestD2) { best = land; bestD2 = d2; } }
  return best;
}
function showTooltip(event, land) {
  if (!land) { els.tooltip.classList.add('hidden'); return; }
  const mapping = mappingByGlobalId().get(Number(land.globalId)); const preview = state.preview?.lookup?.get(Number(land.globalId));
  const duplicateCount = duplicateGroupsForComponent().get(String(land.cadName || '').trim())?.length || 1;
  els.tooltip.innerHTML = `<strong>${mapping?.alias || land.cadName}</strong><br>X-ray: ${mapping?.localIndex ?? '—'}<br>XML ID: ${land.globalId}<br>X: ${formatFloat.format(land.centerX)} · Y: ${formatFloat.format(land.centerY)}${mapping ? `<br>Measurement: ${mapping.measurement ?? '—'}<br>Status: ${isVerifiedMapping(mapping) ? 'Confirmed' : 'Unverified'}` : ''}${duplicateCount > 1 ? `<br><b>ชื่อซ้ำ ${duplicateCount} ตำแหน่ง</b>` : ''}${preview ? `<br>Preview: X-ray ${preview.localIndex} · ${preview.status}` : ''}`;
  const rect = els.canvas.getBoundingClientRect(); els.tooltip.style.left = `${Math.min(rect.width - 190, event.clientX - rect.left + 13)}px`; els.tooltip.style.top = `${Math.min(rect.height - 125, event.clientY - rect.top + 13)}px`; els.tooltip.classList.remove('hidden');
}
function directRemap(mapping, land, label = 'Edit mapping') {
  const component = currentComponent();
  if (!component || !mapping || !land || mapping.sourceRow == null) return;
  const occupied = currentMappings().find((item) => item !== mapping && item.mapped && Number(item.globalId) === Number(land.globalId));
  const changes = [];

  if (occupied) {
    if (isVerifiedMapping(occupied)) {
      const proceed = window.confirm(`ตำแหน่ง ${land.cadName} ถูกยืนยันให้ X-ray ${occupied.localIndex} อยู่แล้ว หากใช้ตำแหน่งนี้ X-ray ${occupied.localIndex} จะถูก Unmap ต้องการดำเนินการต่อหรือไม่?`);
      if (!proceed) return;
    }
    changes.push({
      mapping: occupied,
      before: snapshotMapping(occupied),
      after: stateForUnmapped(occupied, { mappingMethod: isVerifiedMapping(occupied) ? 'displaced-confirmed' : 'displaced-auto-guess' }),
    });
  }

  const lockConfirmed = state.edit.enabled ? state.edit.lockConfirmed : true;
  changes.push({
    mapping,
    before: snapshotMapping(mapping),
    after: stateForLand(mapping, land, {
      manual: true,
      verified: true,
      anchorLocked: lockConfirmed,
      confidence: 100,
      mappingMethod: 'manual-direct',
      duplicateCadNameCount: duplicateCountForLand(land),
    }),
  });

  if (!applyTransaction(label, changes)) {
    if (!isVerifiedMapping(mapping)) {
      const before = snapshotMapping(mapping);
      const after = { ...before, manual: true, verified: true, anchorLocked: lockConfirmed, confidence: 100, mappingMethod: 'manual-direct' };
      applyTransaction('Confirm current mapping', [{ mapping, before, after }]);
    } else return;
  }

  state.selected = mapping;
  toast(`ยืนยัน X-ray ${mapping.localIndex} → ${land.cadName}${occupied ? ` · Unmap X-ray ${occupied.localIndex}` : ''}`);
  if (state.edit.enabled && state.edit.autoNext) advanceSelected(1);
  else { updateDetails(); updateEditPanel(); renderTable(); draw(); }
}
function selectLand(land) {
  if (!land) return;
  if (state.edit.enabled && state.selected?.sourceRow != null) {
    directRemap(state.selected, land);
    return;
  }
  const existing = mappingByGlobalId().get(Number(land.globalId));
  if (existing) selectMapping(existing, false);
  else if (state.edit.enabled) toast('ตำแหน่งนี้ยังไม่มี X-ray Land เลือกแถว X-ray จากตารางก่อน แล้วคลิกตำแหน่งนี้อีกครั้ง');
  else selectMapping({ sourceRow: null, componentName: currentComponent()?.name, packageName: currentComponent()?.packageName, localIndex: land.localIndex, componentId: land.componentId, globalId: land.globalId, cadName: land.cadName, left: land.left, top: land.top, centerX: land.centerX, centerY: land.centerY, width: land.width, length: land.length, measurement: null, confidence: 0, mapped: true, manual: false, verified: false, anchorLocked: false, mappingMethod: 'xml-only', duplicateCadNameCount: duplicateCountForLand(land), raw: null }, false);
}
function toggleAnchor() {
  const mapping = state.selected; if (!mapping?.mapped) return; const before = snapshotMapping(mapping);
  const locking = !mapping.anchorLocked;
  const after = { ...before, anchorLocked: locking, manual: true, verified: locking ? true : Boolean(mapping.verified), confidence: locking ? 100 : mapping.confidence, mappingMethod: locking ? 'manual-anchor' : (mapping.verified ? 'manual-direct' : 'manual-unverified') };
  applyTransaction(locking ? 'Lock anchor' : 'Unlock anchor', [{ mapping, before, after }]); toast(locking ? `ล็อก X-ray ${mapping.localIndex} เป็น Anchor แล้ว` : `ปลด Anchor X-ray ${mapping.localIndex} แล้ว`);
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
  if (!matches.length) {
    const lower = query.toLowerCase();
    matches = currentMappings().filter((m) => String(m.cadName).toLowerCase() === lower || String(m.alias || '').toLowerCase() === lower);
    if (!matches.length) matches = mappings.filter((m) => String(m.cadName).toLowerCase() === lower || String(m.alias || '').toLowerCase() === lower);
  }
  if (!matches.length && state.xmlData) {
    for (const component of state.xmlData.components) for (const land of component.lands) if (String(land.cadName).toLowerCase() === query.toLowerCase() || Number(land.globalId) === number) { state.selectedComponentId = component.id; els.componentSelect.value = component.id; state.duplicateView.selectedName = ''; refreshDuplicateControls(); fitView(); selectLand(land); if (duplicateCountForLand(land) > 1) setSelectedDuplicateName(String(land.cadName).trim(), { fit: true }); toast('พบใน XML แต่ไม่มีแถว X-ray ที่จับคู่'); return; }
  }
  if (!matches.length) return toast(`ไม่พบ ${query}`);
  selectMapping(matches[0], true);
  const name = String(matches[0].cadName || '').trim(); const duplicateLands = duplicateGroupsForComponent().get(name) || [];
  if (duplicateLands.length > 1) { setSelectedDuplicateName(name, { fit: true }); toast(`ชื่อ ${name} ซ้ำ ${duplicateLands.length} ตำแหน่ง และแสดงครบทุกจุดบนกราฟิก`); }
  else if (matches.length > 1) toast(`พบ ${matches.length} ตำแหน่ง เลือกตำแหน่งแรก`);
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
  renderPreviewSummary(); renderTable(); draw(); toast(`Safe Preview: ${formatInt.format(preview.counts.segments || 0)} ช่วง · ข้อเสนอ ${formatInt.format(preview.counts.highConfidence)}`);
}
function previewBetweenAnchors() { const range = getAnchorRange(currentMappings()); if (!range) return toast('ต้องมี Anchor อย่างน้อย 2 จุด'); createPatternPreview({ startLocal: range.start, endLocal: range.end }); }
function clearPreview() { state.preview = null; if (!state.edit.enabled) els.manualBanner.classList.add('hidden'); els.manualBanner.classList.remove('preview-active'); renderPreviewSummary(); renderTable(); draw(); }
function renderPreviewSummary() {
  const preview = state.preview;
  if (!preview) {
    els.previewTitle.textContent = 'ยังไม่มี Preview'; els.previewDirectionBadge.textContent = '—'; els.previewDirectionBadge.className = 'status-pill muted'; els.previewApplicable.textContent = '0'; els.previewHigh.textContent = '0'; els.previewReview.textContent = '0'; els.previewConflict.textContent = '0'; els.previewFormula.textContent = 'วาง Anchor แล้วกดสร้าง Preview'; els.previewWarning.classList.add('hidden'); els.applyPatternButton.disabled = true; els.applyHighButton.disabled = true; els.clearPreviewButton.disabled = true; return;
  }
  const counts = preview.counts; els.previewTitle.textContent = `${formatInt.format(counts.total)} จุดในช่วง ${preview.range.start}–${preview.range.end}`; els.previewDirectionBadge.textContent = preview.direction === 'mixed' ? 'Mixed' : (preview.direction === 'reverse' ? 'Reverse' : 'Forward'); els.previewDirectionBadge.className = 'status-pill ready';
  els.previewApplicable.textContent = formatInt.format(counts.applicable); els.previewHigh.textContent = formatInt.format(counts.highConfidence); els.previewReview.textContent = formatInt.format(counts.rejectedSegments || 0); els.previewConflict.textContent = formatInt.format(counts.conflicts + counts.outOfRange); els.previewFormula.innerHTML = `${preview.formula}<br>Anchor ${counts.anchors} จุด · ช่วงที่ผ่าน ${counts.segments || 0} · ช่วงที่ไม่ผ่าน ${counts.rejectedSegments || 0}`;
  const warnings = []; if (counts.rejectedSegments) warnings.push(`ข้าม ${counts.rejectedSegments} ช่วง เพราะ Anchor ไม่พิสูจน์ลำดับต่อเนื่อง`); if (counts.conflicts || counts.outOfRange) warnings.push(`มี Conflict/Out of range ${counts.conflicts + counts.outOfRange} จุด ระบบจะไม่ Apply จุดเหล่านี้`); warnings.push('ผล Pattern เป็นเพียงข้อเสนอ ยังไม่ถือว่า Confirmed');
  if (warnings.length) { els.previewWarning.textContent = warnings.join(' · '); els.previewWarning.classList.remove('hidden'); } else els.previewWarning.classList.add('hidden');
  els.applyPatternButton.disabled = counts.applicable === 0; els.applyHighButton.disabled = counts.highConfidence === 0; els.clearPreviewButton.disabled = false;
}
function applyPattern(highOnly = false) {
  const preview = state.preview; if (!preview) return; const changes = [];
  for (const proposal of preview.proposals) {
    if (!proposal.land || proposal.status !== 'suggested' || (highOnly && proposal.confidence < 95) || proposal.mapping.anchorLocked || isVerifiedMapping(proposal.mapping)) continue;
    changes.push({ mapping: proposal.mapping, before: snapshotMapping(proposal.mapping), after: stateForLand(proposal.mapping, proposal.land, { manual: false, verified: false, anchorLocked: false, confidence: 60, mappingMethod: 'pattern-suggestion', duplicateCadNameCount: duplicateCountForLand(proposal.land) }) });
  }
  if (!changes.length) return toast('ไม่มีข้อเสนอที่สามารถ Apply ได้');
  applyTransaction('Apply safe pattern suggestions', changes);
  toast(`ใช้เป็นข้อเสนอแล้ว ${formatInt.format(changes.length)} จุด · ยังไม่ Confirmed`);
}
function clearAllAnchors() {
  const anchors = currentMappings().filter((mapping) => mapping.anchorLocked); if (!anchors.length) return; if (!window.confirm(`ปลด Anchor ทั้งหมด ${anchors.length} จุดใช่หรือไม่?`)) return;
  const changes = anchors.map((mapping) => ({ mapping, before: snapshotMapping(mapping), after: { ...snapshotMapping(mapping), anchorLocked: false, verified: Boolean(mapping.verified), mappingMethod: mapping.verified ? 'manual-direct' : 'auto-order-guess' } })); applyTransaction('Clear all anchors', changes); toast('ปลด Anchor ทั้งหมดแล้ว');
}
function shiftCurrentMappings(delta) {
  const component = currentComponent(); if (!component) return; const start = els.patternStart.value === '' ? -Infinity : Number(els.patternStart.value); const end = els.patternEnd.value === '' ? Infinity : Number(els.patternEnd.value);
  const moving = currentMappings().filter((m) => Number(m.localIndex) >= Math.min(start, end) && Number(m.localIndex) <= Math.max(start, end)); const movingSet = new Set(moving);
  const occupiedOutside = new Set(currentMappings().filter((m) => (!movingSet.has(m) || m.anchorLocked) && m.mapped).map((m) => Number(m.globalId))); const changes = [];
  for (const mapping of moving) {
    if (!mapping.mapped || mapping.anchorLocked || isVerifiedMapping(mapping)) continue; const index = findLandIndex(component, mapping.globalId); const land = component.lands[index + delta]; if (!land || occupiedOutside.has(Number(land.globalId))) continue;
    changes.push({ mapping, before: snapshotMapping(mapping), after: stateForLand(mapping, land, { manual: false, verified: false, anchorLocked: false, confidence: 30, mappingMethod: `shift-suggestion-${delta > 0 ? 'plus' : 'minus'}1`, duplicateCadNameCount: duplicateCountForLand(land) }) });
  }
  if (!changes.length) return toast('ไม่มีรายการที่เลื่อนได้ หรือชนกับ Anchor/ขอบเขต'); if (!window.confirm(`Shift Mapping ${delta > 0 ? '+1' : '-1'} จำนวน ${changes.length} จุดใช่หรือไม่?`)) return; applyTransaction(`Shift mappings ${delta > 0 ? '+1' : '-1'}`, changes); toast(`Shift แล้ว ${formatInt.format(changes.length)} จุด`);
}
function unmapRange() {
  const start = els.patternStart.value === '' ? -Infinity : Number(els.patternStart.value); const end = els.patternEnd.value === '' ? Infinity : Number(els.patternEnd.value);
  const targets = currentMappings().filter((m) => Number(m.localIndex) >= Math.min(start, end) && Number(m.localIndex) <= Math.max(start, end) && !m.anchorLocked && m.mapped);
  if (!targets.length) return toast('ไม่มีรายการในช่วงที่สามารถ Unmap ได้'); if (!window.confirm(`Unmap ${targets.length} จุดในช่วงนี้ โดยรักษา Anchor ไว้ใช่หรือไม่?`)) return; applyTransaction('Unmap range', targets.map((mapping) => ({ mapping, before: snapshotMapping(mapping), after: stateForUnmapped(mapping) }))); toast(`Unmap แล้ว ${formatInt.format(targets.length)} จุด`);
}

function counterpartComponent(role, component) {
  const data = state.cadFiles[role]?.data;
  if (!data || !component) return null;
  const exact = data.componentById.get(String(component.id));
  if (exact) return exact;
  const sameName = data.components.filter((candidate) => String(candidate.name).trim().toLowerCase() === String(component.name).trim().toLowerCase());
  return sameName.find((candidate) => String(candidate.packageName).trim().toLowerCase() === String(component.packageName).trim().toLowerCase()) || sameName[0] || null;
}
function reportComponents(scope = els.componentReportScope.value) {
  if (!state.xmlData) return [];
  if (scope === 'raw' && state.mappingData?.componentSummaries?.length) {
    const ids = [...new Set(state.mappingData.componentSummaries.filter((item) => item.componentId != null).map((item) => String(item.componentId)))];
    return ids.map((id) => state.xmlData.componentById.get(id)).filter(Boolean);
  }
  const component = currentComponent() || state.xmlData.components.find((item) => item.lands.length) || null;
  return component ? [component] : [];
}
function componentReportRows(component, nameSource) {
  const mappings = new Map();
  for (const mapping of state.mappingData?.mappings || []) {
    if (String(mapping.componentId) === String(component.id) && mapping.globalId != null) mappings.set(Number(mapping.globalId), mapping);
  }
  const originalComponent = counterpartComponent('original', component);
  const generatedComponent = counterpartComponent('generated', component);
  const originalById = new Map((originalComponent?.lands || []).map((land) => [Number(land.globalId), land]));
  const generatedById = new Map((generatedComponent?.lands || []).map((land) => [Number(land.globalId), land]));
  const rows = component.lands.map((land) => {
    const mapping = mappings.get(Number(land.globalId));
    const originalLand = originalById.get(Number(land.globalId)) || originalComponent?.lands?.[Number(land.localIndex) - 1] || null;
    const generatedLand = generatedById.get(Number(land.globalId)) || generatedComponent?.lands?.[Number(land.localIndex) - 1] || null;
    const originalCadName = originalLand?.cadName || '';
    const generatedCadName = generatedLand?.cadName || '';
    const activeRename = state.cadInspector.renames.get(cadLandKey(component.id, land.globalId));
    const cadName = nameSource === 'original' ? (originalCadName || land.cadName || '')
      : nameSource === 'generated' ? (generatedCadName || land.cadName || '')
        : (activeRename || land.cadName || '');
    const measurementNumber = Number(mapping?.measurement);
    return {
      componentName: component.name || `ID ${component.id}`,
      packageName: component.packageName || '', localIndex: land.localIndex, xrayLand: mapping?.localIndex ?? null,
      globalId: land.globalId, cadName, originalCadName, generatedCadName,
      centerX: land.centerX, centerY: land.centerY, width: land.width, length: land.length,
      measurement: mapping?.measurement == null || mapping?.measurement === '' || !Number.isFinite(measurementNumber) ? null : measurementNumber,
      confirmed: isVerifiedMapping(mapping), mappingStatus: mapping ? (isVerifiedMapping(mapping) ? 'Confirmed' : (mapping.mapped ? 'Unverified' : 'Unmapped')) : 'CAD only',
      duplicateCount: 1, zone: '',
    };
  });
  const counts = new Map();
  for (const item of rows) { const key = String(item.cadName || '').trim(); if (key) counts.set(key, (counts.get(key) || 0) + 1); }
  for (const item of rows) item.duplicateCount = counts.get(String(item.cadName || '').trim()) || 1;
  return rows;
}

function updateComponentReportPreview() {
  const components = reportComponents();
  const zones = Math.max(2, Math.min(4, Number(els.componentReportZones.value) || 3));
  const landCount = components.reduce((sum, component) => sum + component.lands.length, 0);
  const ids = new Set(components.map((component) => String(component.id)));
  const measurements = (state.mappingData?.mappings || []).filter((mapping) => ids.has(String(mapping.componentId)) && Number.isFinite(Number(mapping.measurement))).length;
  els.componentReportPartCount.textContent = formatInt.format(components.length);
  els.componentReportLandCount.textContent = formatInt.format(landCount);
  els.componentReportZoneCount.textContent = formatInt.format(components.length * zones * zones);
  els.componentReportMeasurementCount.textContent = formatInt.format(measurements);
  const rawAvailable = Boolean(state.mappingData?.componentSummaries?.some((item) => item.componentId != null));
  [...els.componentReportScope.options].find((option) => option.value === 'raw').disabled = !rawAvailable;
  if (!rawAvailable && els.componentReportScope.value === 'raw') els.componentReportScope.value = 'current';
  const originalOption = [...els.componentReportNameSource.options].find((option) => option.value === 'original');
  const generatedOption = [...els.componentReportNameSource.options].find((option) => option.value === 'generated');
  originalOption.disabled = !state.cadFiles.original;
  generatedOption.disabled = !state.cadFiles.generated;
  if (els.componentReportNameSource.selectedOptions[0]?.disabled) els.componentReportNameSource.value = 'active';
  els.generateComponentReportButton.disabled = !components.length;
  els.componentReportMessage.textContent = components.length
    ? `จะสร้าง ${formatInt.format(components.length)} Component · ${formatInt.format(landCount)} Land · ${formatInt.format(components.length * zones * zones)} ภาพขยาย` 
    : 'ไม่พบ Component สำหรับสร้างรายงาน';
}
function openComponentReport() {
  if (!state.xmlData) return toast('กรุณานำเข้า CAD ก่อน');
  els.componentReportOverlay.classList.remove('hidden');
  updateComponentReportPreview();
}
function closeComponentReport() {
  els.componentReportOverlay.classList.add('hidden');
}
function reportFileStem(value) {
  return String(value || 'component').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_').replace(/^_+|_+$/g, '') || 'component';
}
async function generateComponentReport() {
  const components = reportComponents();
  if (!components.length) return toast('ไม่พบ Component สำหรับสร้างรายงาน');
  const grid = Math.max(2, Math.min(4, Number(els.componentReportZones.value) || 3));
  const labels = els.componentReportLabels.value;
  const nameSource = els.componentReportNameSource.value;
  const width = Math.max(1400, Math.min(3200, Number(els.componentReportResolution.value) || 2200));
  const height = Math.round(width * 0.66);
  const heatmap = els.componentReportHeatmap.checked;
  const dialog = els.componentReportOverlay.querySelector('.component-report-dialog');
  const oldText = els.generateComponentReportButton.textContent;
  dialog?.classList.add('is-building'); els.generateComponentReportButton.disabled = true; els.generateComponentReportButton.textContent = 'กำลังสร้าง…';
  try {
    const reportComponentsData = [];
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex];
      els.componentReportMessage.textContent = `กำลังเตรียม ${component.name} (${componentIndex + 1}/${components.length})…`; await nextFrame();
      const rows = componentReportRows(component, nameSource);
      const layout = buildZones(component, rows, grid);
      const overviewCanvas = renderOverviewImage({ component, rows, bounds: layout.bounds, zones: layout.zones, width, height, heatmap });
      const overviewPng = await canvasToPngBytes(overviewCanvas);
      const zones = [];
      for (let zoneIndex = 0; zoneIndex < layout.zones.length; zoneIndex += 1) {
        const zone = layout.zones[zoneIndex];
        els.componentReportMessage.textContent = `กำลังวาด ${component.name} · Zone ${zone.label} (${zoneIndex + 1}/${layout.zones.length})…`; await nextFrame();
        const zoneCanvas = renderZoneImage({ component, zone, width, height, labels, heatmap });
        zones.push({ ...zone, imagePng: await canvasToPngBytes(zoneCanvas) });
      }
      const values = rows.map((item) => Number(item.measurement)).filter(Number.isFinite);
      const histogram = histogramModel(values, 50);
      const histogramCanvas = renderHistogramImage(component.name, histogram, Math.min(width, 1800), Math.round(Math.min(width, 1800) * 0.48));
      const imagePng = histogramCanvas ? await canvasToPngBytes(histogramCanvas) : null;
      reportComponentsData.push({
        id: component.id, name: component.name || `ID ${component.id}`, packageName: component.packageName || '', bounds: layout.bounds, rows, zones,
        overviewPng, measurementCount: values.length, histogram: { ...histogram, imagePng },
      });
    }
    els.componentReportMessage.textContent = 'กำลังประกอบไฟล์ Excel และฝังรูปภาพ…'; await nextFrame();
    const nameSourceLabel = ({ active: `${cadRoleLabel(state.activeCadRole)} / ชื่อที่กำลังแสดง`, original: 'Original CAD', generated: 'Generated CAD' })[nameSource] || 'Active CAD';
    const blob = await buildComponentReportXlsx({
      title: `${state.xmlData.board?.Name || 'Board'} · Component CAD Report`, boardName: state.xmlData.board?.Name || '', cadFileName: state.fileNames.xml || activeCadFile()?.name || '', xlsxFileName: state.fileNames.xlsx || '',
      generatedAt: new Date().toISOString(), zoneGrid: grid, nameSourceLabel, components: reportComponentsData,
    });
    const scopeName = components.length === 1 ? components[0].name : 'raw_parts';
    downloadBlob(blob, `${reportFileStem(state.xmlData.board?.Name)}_${reportFileStem(scopeName)}_component_report_v0.9.0.xlsx`);
    els.componentReportMessage.textContent = `สร้าง Excel สำเร็จ · ${formatInt.format(components.length)} Component · ${formatInt.format(reportComponentsData.reduce((sum, item) => sum + item.rows.length, 0))} Land`;
    toast('สร้าง Component Report Excel สำเร็จ', 4200);
  } catch (error) {
    console.error(error); els.componentReportMessage.textContent = `สร้าง Excel ไม่สำเร็จ: ${error.message}`; toast(`สร้าง Excel ไม่สำเร็จ: ${error.message}`, 5200);
  } finally {
    dialog?.classList.remove('is-building'); els.generateComponentReportButton.disabled = false; els.generateComponentReportButton.textContent = oldText; updateComponentReportPreview();
  }
}

function exportCsv() {
  const mappings = state.mappingData?.mappings || [];
  const headers = ['xray_local_land','xml_global_land_id','cad_name','alias','component','package','center_x_mm','center_y_mm','left_mm','top_mm','width_mm','length_mm','measurement','confidence','verified','manual','anchor_locked','mapping_method','duplicate_cad_name_count','source_row'];
  const lines = [headers.join(',')];
  for (const m of mappings) lines.push([m.localIndex, m.globalId, m.cadName, m.alias || '', m.componentName, m.packageName, m.centerX, m.centerY, m.left, m.top, m.width, m.length, m.measurement, m.confidence, isVerifiedMapping(m), m.manual, m.anchorLocked, m.mappingMethod, m.duplicateCadNameCount, m.sourceRow].map(escapeCsv).join(','));
  downloadBlob(new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${state.xmlData?.board?.Name || 'bga'}_land_mapping_v0.9.0.csv`);
}
function exportJson() {
  const overrides = (state.mappingData?.mappings || [])
    .filter((m) => isVerifiedMapping(m) || m.alias || m.mappingMethod === 'manual-unmapped')
    .map((m) => ({ sourceRow: m.sourceRow, localIndex: m.localIndex, componentName: m.componentName, componentId: m.componentId, globalId: m.globalId, cadName: m.cadName, alias: m.alias || '', manual: Boolean(m.manual), verified: isVerifiedMapping(m), mapped: Boolean(m.mapped), anchorLocked: Boolean(m.anchorLocked), confidence: m.confidence, mappingMethod: m.mappingMethod }));
  const cadNameOverrides = [...state.cadInspector.renames.entries()].map(([key, cadName]) => {
    const [componentId, globalId] = key.split('\u0000');
    return { componentId, globalId: Number(globalId), cadName };
  });
  const payload = { app: 'BGA Land Mapper', version: '0.9.0', exportedAt: new Date().toISOString(), files: state.fileNames, board: state.xmlData?.board, schema: state.schema ? { componentCol: state.schema.componentCol, packageCol: state.schema.packageCol, landCol: state.schema.landCol, measurementCol: state.schema.measurementCol } : null, componentSummaries: state.mappingData?.componentSummaries, safeMapping: true, cadNameRules: { maxLength: state.cadInspector.maxLength, prefix: state.cadInspector.prefix }, cadNameOverrides, overrides };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'bga-land-mapper-project-v0.9.0.json');
}
function trustedBackupItem(item) {
  const method = String(item?.mappingMethod || '');
  if (item?.verified === true) return true;
  if (method === 'manual-direct' || method === 'restored-confirmed') return true;
  return Boolean(item?.anchorLocked && method === 'manual-anchor');
}
async function restoreBackup(file) {
  if (!file || !state.xmlData) return;
  try {
    const payload = JSON.parse(await file.text());
    let restoredCadNames = 0;
    if (payload.cadNameRules?.maxLength) state.cadInspector.maxLength = Math.max(2, Number(payload.cadNameRules.maxLength) || 5);
    if (payload.cadNameRules?.prefix) state.cadInspector.prefix = String(payload.cadNameRules.prefix);
    if (Array.isArray(payload.cadNameOverrides)) {
      for (const item of payload.cadNameOverrides) {
        if (item.componentId == null || item.globalId == null) continue;
        const component = state.xmlData.componentById.get(String(item.componentId));
        const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(item.globalId));
        if (!land) continue;
        const key = cadLandKey(item.componentId, item.globalId);
        const value = normalizeCadName(item.cadName).toUpperCase();
        if (value && value !== normalizeCadName(land.originalCadName ?? land.cadName)) {
          state.cadInspector.renames.set(key, value);
          restoredCadNames += 1;
        }
      }
      applyCadNamesToProject({ silent: true });
    }

    let restoredConfirmed = 0;
    let restoredNotes = 0;
    let ignoredGenerated = 0;
    let skipped = 0;
    let mappingChanges = 0;
    if (state.mappingData && Array.isArray(payload.overrides)) {
      const bySourceRow = new Map(state.mappingData.mappings.map((m) => [Number(m.sourceRow), m]));
      const byKey = new Map(state.mappingData.mappings.map((m) => [`${m.componentName}\u0000${m.localIndex}`, m]));
      const changes = [];
      for (const item of payload.overrides) {
        const mapping = bySourceRow.get(Number(item.sourceRow)) || byKey.get(`${item.componentName}\u0000${item.localIndex}`);
        if (!mapping) { skipped += 1; continue; }
        const method = String(item.mappingMethod || '');
        let after = snapshotMapping(mapping);
        let changed = false;
        if (item.alias) { after.alias = String(item.alias); restoredNotes += 1; changed = true; }
        if (item.mapped === false && method === 'manual-unmapped') {
          after = { ...stateForUnmapped(mapping), alias: item.alias || '' };
          changed = true;
        } else if (trustedBackupItem(item) && item.mapped !== false && item.globalId != null) {
          const component = state.xmlData.componentById.get(String(item.componentId || mapping.componentId));
          const land = component?.lands.find((candidate) => Number(candidate.globalId) === Number(item.globalId));
          if (!land) { skipped += 1; continue; }
          after = stateForLand(mapping, land, { manual: true, verified: true, anchorLocked: Boolean(item.anchorLocked), confidence: 100, mappingMethod: item.anchorLocked ? 'manual-anchor' : 'manual-direct', duplicateCadNameCount: duplicateCountForLand(land) });
          after.alias = item.alias || '';
          restoredConfirmed += 1;
          changed = true;
        } else if (isUnsafeGeneratedMapping(item) || item.manual) ignoredGenerated += 1;
        if (changed) changes.push({ mapping, before: snapshotMapping(mapping), after });
      }
      if (changes.length) { applyTransaction('Restore safe backup JSON', changes); mappingChanges = changes.length; }
    }

    if (!restoredCadNames && !mappingChanges) throw new Error('ไม่พบข้อมูลชื่อ CAD หรือจุด Mapping ที่กู้คืนได้ใน Backup นี้');
    toast(`กู้คืนชื่อ CAD ${formatInt.format(restoredCadNames)} จุด${restoredConfirmed ? ` · Confirmed ${formatInt.format(restoredConfirmed)} จุด` : ''}${restoredNotes ? ` · หมายเหตุ ${formatInt.format(restoredNotes)}` : ''}${ignoredGenerated ? ` · ตัด Mapping ที่ระบบกระจาย ${formatInt.format(ignoredGenerated)} จุด` : ''}${skipped ? ` · ข้าม ${formatInt.format(skipped)}` : ''}`, 6500);
  } catch (error) { console.error(error); toast(`นำเข้า Backup ไม่สำเร็จ: ${error.message}`, 5200); }
  finally { els.restoreFile.value = ''; }
}
function resizeCanvas() { draw(); renderHistogram(); if (!els.histogramOverlay.classList.contains('hidden')) renderDetailedHistogram(); }

els.projectFile.addEventListener('change', (event) => processFile(event.target.files[0], 'auto'));
els.originalCadButton.addEventListener('click', () => els.originalCadFile.click());
els.originalCadFile.addEventListener('change', (event) => processFile(event.target.files[0], 'original'));
els.generatedCadButton.addEventListener('click', () => els.generatedCadFile.click());
els.generatedCadFile.addEventListener('change', (event) => processFile(event.target.files[0], 'generated'));
els.dropZone.addEventListener('dragover', (event) => { event.preventDefault(); els.dropZone.classList.add('drag'); });
els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag'));
els.dropZone.addEventListener('drop', (event) => { event.preventDefault(); els.dropZone.classList.remove('drag'); processFile(event.dataTransfer.files[0], 'auto'); });
els.restoreButton.addEventListener('click', () => els.restoreFile.click());
els.restoreFile.addEventListener('change', (event) => restoreBackup(event.target.files[0]));
els.resetButton.addEventListener('click', resetProject); els.remapButton.addEventListener('click', runMapping);
els.cadInspectorButton.addEventListener('click', openCadInspector);
els.cadCompareButton.addEventListener('click', openCadCompare);
els.closeCadCompareButton.addEventListener('click', closeCadCompare);
els.cadCompareOverlay.addEventListener('click', (event) => { if (event.target === els.cadCompareOverlay) closeCadCompare(); });
els.rebuildCadCompareButton.addEventListener('click', () => { state.cadCompare.page = 1; rebuildCadComparison({ showToast: true }); });
els.cadCompareTolerance.addEventListener('change', () => { state.cadCompare.page = 1; rebuildCadComparison(); });
els.cadCompareFilter.addEventListener('change', () => { state.cadCompare.filter = els.cadCompareFilter.value; state.cadCompare.page = 1; renderCadCompare(); });
els.cadCompareSearch.addEventListener('input', () => { state.cadCompare.search = els.cadCompareSearch.value; state.cadCompare.page = 1; renderCadCompare(); });
els.useOriginalCadButton.addEventListener('click', () => { activateCad('original'); closeCadCompare(); });
els.useGeneratedCadButton.addEventListener('click', () => { activateCad('generated'); closeCadCompare(); });
els.fitCadCompareButton.addEventListener('click', () => { fitCadCompareRow(); closeCadCompare(); });
els.exportCadCompareButton.addEventListener('click', exportCadComparison);
els.cadComparePrevPage.addEventListener('click', () => { state.cadCompare.page -= 1; renderCadCompare(); });
els.cadCompareNextPage.addEventListener('click', () => { state.cadCompare.page += 1; renderCadCompare(); });
els.closeCadInspectorButton.addEventListener('click', closeCadInspector);
els.cadInspectorOverlay.addEventListener('click', (event) => { if (event.target === els.cadInspectorOverlay) closeCadInspector(); });
els.cadInspectorScope.addEventListener('change', () => { state.cadInspector.page = 1; refreshCadInspector(); });
els.cadMaxLength.addEventListener('change', () => { state.cadInspector.page = 1; refreshCadInspector(); });
els.cadNamePrefix.addEventListener('change', refreshCadInspector);
els.cadIssueFilter.addEventListener('change', () => { state.cadInspector.page = 1; refreshCadInspector(); });
els.cadInspectorSearch.addEventListener('input', () => { state.cadInspector.page = 1; refreshCadInspector(); });
els.cadAutoFixButton.addEventListener('click', () => { refreshCadInspector(); generateCadNames(false); });
els.cadRenameAllButton.addEventListener('click', () => { refreshCadInspector(); generateCadNames(true); });
els.cadResetNamesButton.addEventListener('click', resetCadNames);
els.cadExportReportButton.addEventListener('click', exportCadAuditReport);
els.cadApplyNamesButton.addEventListener('click', () => applyCadNamesToProject());
els.cadExportXmlButton.addEventListener('click', exportCorrectedCadXml);
els.cadInspectorPrevPage.addEventListener('click', () => { state.cadInspector.page -= 1; renderCadInspectorTable(); });
els.cadInspectorNextPage.addEventListener('click', () => { state.cadInspector.page += 1; renderCadInspectorTable(); });
els.activeCadSelect.addEventListener('change', () => { if (els.activeCadSelect.value) activateCad(els.activeCadSelect.value); });
els.componentSelect.addEventListener('change', () => { state.selectedComponentId = els.componentSelect.value; state.selected = null; state.preview = null; state.page = 1; state.duplicateView.selectedName = ''; resetHistogramState(); clearDetails(); refreshDuplicateControls(); updateStats(); renderTable(); renderTeachPanel(); fitView(); renderHistogram(); renderDetailedHistogram(); });
els.cadCompareOverlayToggle.addEventListener('change', () => { state.cadCompare.overlayEnabled = els.cadCompareOverlayToggle.checked; draw(); });
els.histogramBins.addEventListener('change', renderHistogram);
els.expandHistogramButton.addEventListener('click', openDetailedHistogram);
els.measurementHistogram.addEventListener('click', openDetailedHistogram);
els.closeHistogramButton.addEventListener('click', closeDetailedHistogram);
els.histogramOverlay.addEventListener('click', (event) => { if (event.target === els.histogramOverlay) closeDetailedHistogram(); });
els.detailedHistogramBins.addEventListener('change', () => { state.histogram.selectedBin = null; renderDetailedHistogram(); });
els.histogramYMode.addEventListener('change', renderDetailedHistogram);
els.applyHistogramRangeButton.addEventListener('click', applyHistogramRangeFromInputs);
els.resetHistogramRangeButton.addEventListener('click', resetHistogramRange);
els.zoomHistogramBinButton.addEventListener('click', zoomToSelectedHistogramBin);
els.exportHistogramButton.addEventListener('click', exportHistogramCsv);
els.histogramCadFilter.addEventListener('change', () => { state.histogram.filterEnabled = els.histogramCadFilter.checked; draw(); });
els.detailedHistogramCanvas.addEventListener('pointerdown', (event) => {
  const point = detailedHistogramPoint(event); const layout = state.histogram.layout;
  if (!layout || point.x < layout.margin.left || point.x > layout.margin.left + layout.chartW || point.y < layout.margin.top || point.y > layout.margin.top + layout.chartH) return;
  els.detailedHistogramCanvas.setPointerCapture(event.pointerId); state.histogram.drag = { startX: point.x, currentX: point.x, pointerId: event.pointerId };
});
els.detailedHistogramCanvas.addEventListener('pointermove', (event) => {
  const point = detailedHistogramPoint(event);
  if (state.histogram.drag) { state.histogram.drag.currentX = point.x; renderDetailedHistogram(); return; }
  const binIndex = histogramBinAtPoint(point);
  if (binIndex !== state.histogram.hoveredBin) { state.histogram.hoveredBin = binIndex; renderDetailedHistogram(); }
  showDetailedHistogramTooltip(event, binIndex);
});
els.detailedHistogramCanvas.addEventListener('pointerup', (event) => {
  const drag = state.histogram.drag; if (!drag) return;
  const point = detailedHistogramPoint(event); state.histogram.drag = null; els.histogramSelectionLabel.classList.add('hidden');
  if (Math.abs(point.x - drag.startX) < 5) {
    const binIndex = histogramBinAtPoint(point); state.histogram.selectedBin = binIndex; renderDetailedHistogram(); showDetailedHistogramTooltip(event, binIndex); return;
  }
  const layout = state.histogram.layout; if (!layout) return;
  const low = histogramValueAtX(Math.min(drag.startX, point.x), layout); const high = histogramValueAtX(Math.max(drag.startX, point.x), layout); setHistogramRange(low, high);
});
els.detailedHistogramCanvas.addEventListener('pointercancel', () => { state.histogram.drag = null; els.histogramSelectionLabel.classList.add('hidden'); renderDetailedHistogram(); });
els.detailedHistogramCanvas.addEventListener('pointerleave', () => { if (!state.histogram.drag) { state.histogram.hoveredBin = null; els.histogramTooltip.classList.add('hidden'); renderDetailedHistogram(); } });
els.detailedHistogramCanvas.addEventListener('wheel', (event) => {
  event.preventDefault(); const layout = state.histogram.layout; if (!layout?.values?.length) return;
  const point = detailedHistogramPoint(event); const ratio = Math.max(0, Math.min(1, (point.x - layout.margin.left) / layout.chartW));
  const fullSpan = layout.fullMax - layout.fullMin || 1; const currentSpan = layout.rangeMax - layout.rangeMin || fullSpan;
  let newSpan = currentSpan * (event.deltaY < 0 ? 0.72 : 1.38); newSpan = Math.max(fullSpan / 100000, Math.min(fullSpan, newSpan));
  if (newSpan >= fullSpan * 0.999999) { resetHistogramRange(); return; }
  const centerValue = layout.rangeMin + ratio * currentSpan; let min = centerValue - ratio * newSpan; let max = min + newSpan;
  if (min < layout.fullMin) { max += layout.fullMin - min; min = layout.fullMin; } if (max > layout.fullMax) { min -= max - layout.fullMax; max = layout.fullMax; }
  setHistogramRange(min, max);
}, { passive: false });
els.heatmapToggle.addEventListener('change', draw); els.labelToggle.addEventListener('change', draw);
els.duplicateToggle.addEventListener('change', () => { state.duplicateView.enabled = els.duplicateToggle.checked; els.duplicateOnlyToggle.disabled = !state.duplicateView.enabled || duplicateGroupsForComponent().size === 0; draw(); });
els.duplicateOnlyToggle.addEventListener('change', () => { state.duplicateView.dimOthers = els.duplicateOnlyToggle.checked; draw(); });
els.duplicateNameSelect.addEventListener('change', () => setSelectedDuplicateName(els.duplicateNameSelect.value, { fit: Boolean(els.duplicateNameSelect.value) }));
els.fitDuplicateButton.addEventListener('click', fitDuplicateGroup);
els.clearDuplicateButton.addEventListener('click', () => setSelectedDuplicateName(''));
els.fitButton.addEventListener('click', fitView); els.zoomInButton.addEventListener('click', () => zoomAt(1.3)); els.zoomOutButton.addEventListener('click', () => zoomAt(1 / 1.3));
els.searchButton.addEventListener('click', search); els.searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') search(); });
els.tableFilter.addEventListener('change', () => { state.filter = els.tableFilter.value; state.page = 1; renderTable(); }); els.prevPage.addEventListener('click', () => { state.page -= 1; renderTable(); }); els.nextPage.addEventListener('click', () => { state.page += 1; renderTable(); });
els.exportCsvButton.addEventListener('click', exportCsv); els.exportExcelButton.addEventListener('click', openComponentReport); els.exportJsonButton.addEventListener('click', exportJson);

els.closeComponentReportButton.addEventListener('click', closeComponentReport);
els.cancelComponentReportButton.addEventListener('click', closeComponentReport);
els.componentReportOverlay.addEventListener('click', (event) => { if (event.target === els.componentReportOverlay) closeComponentReport(); });
for (const control of [els.componentReportScope, els.componentReportZones, els.componentReportLabels, els.componentReportNameSource, els.componentReportResolution, els.componentReportHeatmap]) control.addEventListener('change', updateComponentReportPreview);
els.generateComponentReportButton.addEventListener('click', generateComponentReport);
els.manualButton.addEventListener('click', () => setEditMode(!state.edit.enabled));
els.exitEditButton.addEventListener('click', () => setEditMode(false));
els.editPrevButton.addEventListener('click', () => advanceSelected(-1));
els.editNextButton.addEventListener('click', () => advanceSelected(1));
els.editAutoNext.addEventListener('change', () => { state.edit.autoNext = els.editAutoNext.checked; updateEditPanel(); });
els.editLockConfirmed.addEventListener('change', () => { state.edit.lockConfirmed = els.editLockConfirmed.checked; updateEditPanel(); });
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
window.addEventListener('keydown', (event) => { const tag = document.activeElement?.tagName; if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); } if (state.edit.enabled && event.key === 'ArrowLeft') { event.preventDefault(); advanceSelected(-1); } if (state.edit.enabled && event.key === 'ArrowRight') { event.preventDefault(); advanceSelected(1); } if (event.key === 'Escape') { setEditMode(false); closeTeachPanel(); closeDetailedHistogram(); closeCadInspector(); closeComponentReport(); } });
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.installPrompt = event; els.installButton.classList.remove('hidden'); });
els.installButton.addEventListener('click', async () => { if (!state.installPrompt) return; state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; els.installButton.classList.add('hidden'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(els.canvas);
resizeObserver.observe(els.measurementHistogram);
resizeObserver.observe(els.detailedHistogramCanvas);
resetProject();
