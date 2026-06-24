const EDITABLE_FIELDS = [
  'componentId', 'globalId', 'cadName', 'left', 'top', 'centerX', 'centerY',
  'width', 'length', 'mapped', 'manual', 'confidence', 'anchorLocked',
  'mappingMethod', 'duplicateCadNameCount', 'alias',
];

export function snapshotMapping(mapping) {
  const snapshot = {};
  for (const key of EDITABLE_FIELDS) snapshot[key] = mapping[key] ?? null;
  return snapshot;
}

export function restoreMapping(mapping, snapshot) {
  for (const key of EDITABLE_FIELDS) mapping[key] = snapshot[key];
  return mapping;
}

export function stateForLand(mapping, land, options = {}) {
  return {
    ...snapshotMapping(mapping),
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
    manual: options.manual ?? true,
    confidence: options.confidence ?? 100,
    anchorLocked: options.anchorLocked ?? Boolean(mapping.anchorLocked),
    mappingMethod: options.mappingMethod || 'manual',
    duplicateCadNameCount: options.duplicateCadNameCount ?? mapping.duplicateCadNameCount ?? 1,
  };
}

export function stateForUnmapped(mapping) {
  return {
    ...snapshotMapping(mapping),
    globalId: null,
    cadName: '',
    left: null,
    top: null,
    centerX: null,
    centerY: null,
    width: null,
    length: null,
    mapped: false,
    manual: true,
    confidence: 0,
    anchorLocked: false,
    mappingMethod: 'manual-unmapped',
    duplicateCadNameCount: 0,
  };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function landIndexByGlobalId(component) {
  const map = new Map();
  component.lands.forEach((land, index) => map.set(Number(land.globalId), index));
  return map;
}

function normalizeRange(mappings, startLocal, endLocal) {
  const locals = mappings.map((m) => Number(m.localIndex)).filter(Number.isFinite);
  const minimum = locals.length ? Math.min(...locals) : 1;
  const maximum = locals.length ? Math.max(...locals) : 1;
  const hasStart = startLocal !== null && startLocal !== undefined && startLocal !== '' && Number.isFinite(Number(startLocal));
  const hasEnd = endLocal !== null && endLocal !== undefined && endLocal !== '' && Number.isFinite(Number(endLocal));
  let start = hasStart ? Number(startLocal) : minimum;
  let end = hasEnd ? Number(endLocal) : maximum;
  if (start > end) [start, end] = [end, start];
  return { start: Math.max(minimum, start), end: Math.min(maximum, end), minimum, maximum };
}

function fitDirection(anchors, direction, componentSize) {
  if (!anchors.length) {
    return direction === 'reverse'
      ? { direction, constant: componentSize - 1, residuals: [], maxResidual: 0, totalResidual: 0, inferredWithoutAnchor: true }
      : { direction: 'forward', constant: 0, residuals: [], maxResidual: 0, totalResidual: 0, inferredWithoutAnchor: true };
  }
  const constants = anchors.map(({ localIndex, cadIndex }) => direction === 'reverse'
    ? cadIndex + (localIndex - 1)
    : cadIndex - (localIndex - 1));
  const constant = Math.round(median(constants));
  const residuals = anchors.map(({ localIndex, cadIndex }) => {
    const expected = direction === 'reverse' ? constant - (localIndex - 1) : (localIndex - 1) + constant;
    return Math.abs(cadIndex - expected);
  });
  return {
    direction,
    constant,
    residuals,
    maxResidual: residuals.length ? Math.max(...residuals) : 0,
    totalResidual: residuals.reduce((sum, value) => sum + value, 0),
    inferredWithoutAnchor: false,
  };
}

export function createSequencePreview({ mappings, component, direction = 'auto', userShift = 0, startLocal = null, endLocal = null, preserveAnchors = true }) {
  if (!component || !Array.isArray(component.lands) || !component.lands.length) return { ok: false, error: 'Component นี้ไม่มีข้อมูล Land' };
  const componentMappings = mappings.filter((m) => Number.isFinite(Number(m.localIndex))).sort((a, b) => Number(a.localIndex) - Number(b.localIndex));
  if (!componentMappings.length) return { ok: false, error: 'ไม่พบรายการ X-ray Land ใน Component นี้' };

  const indexByGlobal = landIndexByGlobalId(component);
  const anchors = componentMappings
    .filter((mapping) => mapping.anchorLocked && mapping.mapped && indexByGlobal.has(Number(mapping.globalId)))
    .map((mapping) => ({ mapping, localIndex: Number(mapping.localIndex), cadIndex: indexByGlobal.get(Number(mapping.globalId)) }));

  const forwardFit = fitDirection(anchors, 'forward', component.lands.length);
  const reverseFit = fitDirection(anchors, 'reverse', component.lands.length);
  let fit;
  if (direction === 'forward') fit = forwardFit;
  else if (direction === 'reverse') fit = reverseFit;
  else fit = reverseFit.totalResidual < forwardFit.totalResidual ? reverseFit : forwardFit;

  const shift = Number.isFinite(Number(userShift)) ? Math.trunc(Number(userShift)) : 0;
  const range = normalizeRange(componentMappings, startLocal, endLocal);
  const anchorGlobalIds = new Map(anchors.map((anchor) => [anchor.localIndex, Number(anchor.mapping.globalId)]));
  const lockedTargetOwners = new Map(anchors.map((anchor) => [anchor.cadIndex, anchor.mapping]));
  const fixedTargetOwners = new Map();
  for (const fixed of componentMappings) {
    const local = Number(fixed.localIndex);
    if (local >= range.start && local <= range.end) continue;
    if (!fixed.mapped || !indexByGlobal.has(Number(fixed.globalId))) continue;
    fixedTargetOwners.set(indexByGlobal.get(Number(fixed.globalId)), fixed);
  }
  const proposedTargetOwners = new Map();
  const proposals = [];
  let outOfRange = 0;
  let conflicts = 0;
  let highConfidence = 0;
  let review = 0;

  const baseConfidence = anchors.length >= 2
    ? (fit.maxResidual === 0 ? 98 : fit.maxResidual <= 1 ? 88 : 70)
    : anchors.length === 1 ? 84 : 65;

  for (const mapping of componentMappings) {
    const localIndex = Number(mapping.localIndex);
    if (localIndex < range.start || localIndex > range.end) continue;
    let targetIndex = fit.direction === 'reverse'
      ? fit.constant - (localIndex - 1) + shift
      : (localIndex - 1) + fit.constant + shift;
    targetIndex = Math.trunc(targetIndex);
    const isAnchor = Boolean(mapping.anchorLocked && mapping.mapped && indexByGlobal.has(Number(mapping.globalId)));
    const actualAnchorIndex = isAnchor ? indexByGlobal.get(Number(mapping.globalId)) : null;
    let status = 'suggested';
    let reason = '';

    if (isAnchor && preserveAnchors) {
      if (actualAnchorIndex !== targetIndex) {
        status = 'anchor-conflict';
        reason = `สูตรเสนอ index ${targetIndex + 1} แต่ Anchor อยู่ index ${actualAnchorIndex + 1}`;
        conflicts += 1;
      }
      targetIndex = actualAnchorIndex;
    }
    const land = component.lands[targetIndex] || null;
    if (!land) {
      outOfRange += 1;
      proposals.push({ mapping, localIndex, targetIndex, land: null, status: 'out-of-range', confidence: 0, reason: 'ตำแหน่งเกินขอบเขต CAD' });
      continue;
    }
    const lockedOwner = lockedTargetOwners.get(targetIndex);
    if (lockedOwner && lockedOwner !== mapping && !isAnchor) {
      status = 'conflict'; reason = `ชนกับ Anchor X-ray ${lockedOwner.localIndex}`; conflicts += 1;
    }
    const fixedOwner = fixedTargetOwners.get(targetIndex);
    if (fixedOwner && fixedOwner !== mapping && status === 'suggested') {
      status = 'conflict'; reason = `ชนกับ X-ray ${fixedOwner.localIndex} ที่อยู่นอกช่วง Preview`; conflicts += 1;
    }
    const proposedOwner = proposedTargetOwners.get(targetIndex);
    if (proposedOwner && proposedOwner !== mapping) {
      status = 'conflict'; reason = `ตำแหน่งซ้ำกับ X-ray ${proposedOwner.localIndex}`; conflicts += 1;
    } else proposedTargetOwners.set(targetIndex, mapping);

    const anchorExpected = anchorGlobalIds.get(localIndex);
    if (anchorExpected != null && Number(land.globalId) !== anchorExpected) {
      status = 'anchor-conflict'; reason = 'ผล Preview ไม่ตรงกับ Anchor ที่ล็อกไว้'; conflicts += 1;
    }
    const confidence = isAnchor ? 100 : status === 'suggested' ? baseConfidence : 0;
    if (confidence >= 95) highConfidence += 1;
    else if (confidence > 0) review += 1;
    proposals.push({ mapping, localIndex, targetIndex, land, status: isAnchor ? (status === 'anchor-conflict' ? status : 'anchor') : status, confidence, reason });
  }

  const formula = fit.direction === 'reverse'
    ? `CAD index = ${fit.constant + 1}${shift ? ` ${shift > 0 ? '+' : '-'} ${Math.abs(shift)}` : ''} − (X-ray Land − 1)`
    : `CAD index = (X-ray Land − 1) + ${fit.constant}${shift ? ` ${shift > 0 ? '+' : '-'} ${Math.abs(shift)}` : ''}`;

  return {
    ok: true, anchors, fit, direction: fit.direction, shift, range, formula, proposals,
    counts: {
      total: proposals.length,
      anchors: anchors.length,
      highConfidence,
      review,
      conflicts,
      outOfRange,
      applicable: proposals.filter((p) => p.land && !['conflict', 'anchor-conflict'].includes(p.status)).length,
    },
  };
}

export function findLandIndex(component, globalId) {
  return component.lands.findIndex((land) => Number(land.globalId) === Number(globalId));
}

export function getAnchorRange(mappings) {
  const locals = mappings.filter((m) => m.anchorLocked && Number.isFinite(Number(m.localIndex))).map((m) => Number(m.localIndex)).sort((a, b) => a - b);
  return locals.length < 2 ? null : { start: locals[0], end: locals[locals.length - 1] };
}
