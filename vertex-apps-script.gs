/**
 * Vertex — Google Sheets + Apps Script 다중 기기 실시간 동기화 스크립트
 *
 * [설치 및 배포 방법]
 * 1. Google Sheets에서 새 스프레드시트를 만듭니다.
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script]를 엽니다.
 * 3. 기본 코드(myFunction)를 모두 지우고 이 파일(.gs) 내용을 전체 붙여넣기 한 뒤 저장(Ctrl+S)합니다.
 * 4. (권장 보안 설정) Apps Script 좌측 [프로젝트 설정(톱니바퀴)] -> [스크립트 속성]에
 *    속성 이름: VERTEX_SYNC_TOKEN / 값: 본인만의 비밀 문자열(예: my-secret-2026) 을 추가합니다.
 *    (필수: 설정하지 않으면 모든 데이터 API 요청이 차단됩니다.)
 * 5. 우측 상단 [배포] -> [새 배포] -> 유형: [웹 앱] 선택:
 *    - 다음 사용자 권한으로 실행: 나(본인 계정)
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 * 6. 생성된 웹 앱 URL(https://script.google.com/macros/s/.../exec)을 복사해
 *    Vertex 서버 환경변수(Settings > Secrets)에 APPS_SCRIPT_URL 로 등록하세요.
 *    (4번에서 토큰을 설정했다면 APPS_SCRIPT_TOKEN 도 함께 등록하세요.)
 */

const SHEET_SCHEMA = {
  Tasks: ['id', 'text', 'subject', 'priority', 'repeat', 'due', 'done', 'subtasksJson', 'updatedAt', 'deleted'],
  Events: ['id', 'title', 'date', 'time', 'location', 'travelMinutes', 'routeSummary', 'category', 'repeat', 'remind', 'description', 'updatedAt', 'deleted'],
  Notes: ['id', 'title', 'tag', 'content', 'pinned', 'updatedAt', 'deleted'],
  Ddays: ['id', 'title', 'category', 'date', 'updatedAt', 'deleted'],
  Habits: ['id', 'title', 'datesJson', 'updatedAt', 'deleted'],
  StudySessions: ['id', 'date', 'subject', 'minutes', 'updatedAt', 'deleted'],
  WrongNotes: ['id', 'subject', 'question', 'reason', 'reviewed', 'updatedAt', 'deleted'],
  Flashcards: ['id', 'subject', 'front', 'back', 'intervalDays', 'nextReview', 'mastered', 'updatedAt', 'deleted'],
  Grades: ['id', 'subject', 'credits', 'score', 'grade', 'semester', 'updatedAt', 'deleted'],
  PrepItems: ['id', 'text', 'done', 'updatedAt', 'deleted'],
  AcademicEvents: ['id', 'title', 'kind', 'date', 'source', 'updatedAt', 'deleted'],
  Routes: ['id', 'label', 'departure', 'destination', 'minutes', 'transfers', 'walkMinutes', 'fare', 'lastBus', 'updatedAt', 'deleted'],
  TransitFavorites: ['id', 'kind', 'name', 'code', 'line', 'updatedAt', 'deleted'],
  ExamChecklist: ['id', 'subject', 'topic', 'done', 'updatedAt', 'deleted'],
  Lessons: ['day', 'subjectsJson', 'updatedAt'],
  ProfileMeta: ['key', 'valueJson', 'updatedAt']
};

const COLLECTION_TO_SHEET = [
  ['tasks', 'Tasks'],
  ['events', 'Events'],
  ['notes', 'Notes'],
  ['ddays', 'Ddays'],
  ['habits', 'Habits'],
  ['studySessions', 'StudySessions'],
  ['wrongNotes', 'WrongNotes'],
  ['flashcards', 'Flashcards'],
  ['grades', 'Grades'],
  ['prepItems', 'PrepItems'],
  ['academicEvents', 'AcademicEvents'],
  ['routes', 'Routes'],
  ['transitFavorites', 'TransitFavorites'],
  ['examChecklist', 'ExamChecklist']
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vertex 동기화')
    .addItem('시트 초기 구조 만들기', 'setupSheets')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);
}

function getExpectedToken() {
  return String(PropertiesService.getScriptProperties().getProperty('VERTEX_SYNC_TOKEN') || '').trim();
}

function isAuthorized(providedToken) {
  const expected = getExpectedToken();
  if (!expected) return false;
  return String(providedToken || '').trim() === expected;
}

function ensureSheets(ss) {
  const names = Object.keys(SHEET_SCHEMA);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const cols = SHEET_SCHEMA[name];
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(cols);
      const headerRange = sheet.getRange(1, 1, 1, cols.length);
      headerRange.setBackground('#0284c7').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
}

function clipCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean' || typeof val === 'number') return val;
  const s = String(val);
  return s.length > 45000 ? s.slice(0, 45000) : s;
}

function parseJsonSafe(raw, fallback) {
  try {
    return raw ? JSON.parse(String(raw)) : fallback;
  } catch (err) {
    return fallback;
  }
}

function readCollectionSheet(sheet, cols) {
  const values = sheet.getDataRange().getValues();
  const active = [];
  const deleted = {};
  if (values.length <= 1) return { active, deleted };

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = String(row[0] || '').trim();
    if (!id) continue;
    const obj = {};
    for (let c = 0; c < cols.length; c++) {
      obj[cols[c]] = row[c];
    }
    const upd = Number(obj.updatedAt) || 0;
    const isDeleted = obj.deleted === true || String(obj.deleted).toLowerCase() === 'true';
    if (isDeleted) {
      deleted[id] = upd;
      continue;
    }

    if (cols.indexOf('subtasksJson') >= 0) {
      obj.subtasks = parseJsonSafe(obj.subtasksJson, []);
      delete obj.subtasksJson;
    }
    if (cols.indexOf('datesJson') >= 0) {
      obj.dates = parseJsonSafe(obj.datesJson, {});
      delete obj.datesJson;
    }
    if (cols.indexOf('done') >= 0) obj.done = obj.done === true || String(obj.done).toLowerCase() === 'true';
    if (cols.indexOf('pinned') >= 0) obj.pinned = obj.pinned === true || String(obj.pinned).toLowerCase() === 'true';
    if (cols.indexOf('reviewed') >= 0) obj.reviewed = obj.reviewed === true || String(obj.reviewed).toLowerCase() === 'true';
    if (cols.indexOf('mastered') >= 0) obj.mastered = obj.mastered === true || String(obj.mastered).toLowerCase() === 'true';
    if (cols.indexOf('remind') >= 0) obj.remind = !(obj.remind === false || String(obj.remind).toLowerCase() === 'false');
    if (cols.indexOf('travelMinutes') >= 0) obj.travelMinutes = obj.travelMinutes === '' ? '' : Number(obj.travelMinutes) || '';
    if (cols.indexOf('minutes') >= 0) obj.minutes = Number(obj.minutes) || 0;
    if (cols.indexOf('credits') >= 0) obj.credits = Number(obj.credits) || 1;
    if (cols.indexOf('score') >= 0) obj.score = Number(obj.score) || 0;
    if (cols.indexOf('grade') >= 0) obj.grade = String(obj.grade || '2');
    if (cols.indexOf('intervalDays') >= 0) obj.intervalDays = Number(obj.intervalDays) || 1;
    if (cols.indexOf('transfers') >= 0) obj.transfers = Number(obj.transfers) || 0;
    if (cols.indexOf('walkMinutes') >= 0) obj.walkMinutes = Number(obj.walkMinutes) || 0;
    if (cols.indexOf('fare') >= 0) obj.fare = Number(obj.fare) || 0;
    obj.updatedAt = upd;
    delete obj.deleted;
    active.push(obj);
  }
  return { active, deleted };
}

function serializeItemRow(item, cols, isDeleted) {
  return cols.map(function(col) {
    if (col === 'deleted') return Boolean(isDeleted);
    if (col === 'subtasksJson') return clipCell(JSON.stringify(item.subtasks || []));
    if (col === 'datesJson') return clipCell(JSON.stringify(item.dates || {}));
    if (col === 'updatedAt') return Number(item.updatedAt) || Date.now();
    return clipCell(item[col]);
  });
}

function mergeCollectionSheet(sheet, cols, incomingItems, incomingDeletedMap) {
  const existingValues = sheet.getDataRange().getValues();
  const byId = {};

  for (let r = 1; r < existingValues.length; r++) {
    const row = existingValues[r];
    const id = String(row[0] || '').trim();
    if (!id) continue;
    const record = {};
    for (let c = 0; c < cols.length; c++) {
      record[cols[c]] = row[c];
    }
    byId[id] = {
      rowIndex: r + 1,
      updatedAt: Number(record.updatedAt) || 0,
      deleted: record.deleted === true || String(record.deleted).toLowerCase() === 'true',
      record: record
    };
  }

  const rowsToAppend = [];

  // Apply active incoming items
  const items = Array.isArray(incomingItems) ? incomingItems : [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.id) continue;
    const id = String(item.id);
    const incUpd = Number(item.updatedAt) || 0;
    const cur = byId[id];
    const serialized = serializeItemRow(item, cols, false);

    if (!cur) {
      rowsToAppend.push(serialized);
      byId[id] = { rowIndex: -1, updatedAt: incUpd, deleted: false };
    } else if (incUpd >= cur.updatedAt) {
      sheet.getRange(cur.rowIndex, 1, 1, cols.length).setValues([serialized]);
      cur.updatedAt = incUpd;
      cur.deleted = false;
    }
  }

  // Apply deletion tombstones
  const delMap = incomingDeletedMap && typeof incomingDeletedMap === 'object' ? incomingDeletedMap : {};
  const delIds = Object.keys(delMap);
  for (let j = 0; j < delIds.length; j++) {
    const delId = String(delIds[j]);
    const delAt = Number(delMap[delId]) || 0;
    const cur = byId[delId];
    const delRow = serializeItemRow({ id: delId, updatedAt: delAt }, cols, true);
    if (!cur) {
      rowsToAppend.push(delRow);
    } else if (delAt >= cur.updatedAt && !cur.deleted) {
      sheet.getRange(cur.rowIndex, 1, 1, cols.length).setValues([delRow]);
      cur.updatedAt = delAt;
      cur.deleted = true;
    }
  }

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, cols.length).setValues(rowsToAppend);
  }
}

function readLessonsSheet(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const list = [];
  for (let r = 1; r < values.length; r++) {
    const day = Number(values[r][0]);
    if (!isNaN(day)) {
      list.push({
        day: day,
        subjects: parseJsonSafe(values[r][1], []),
        updatedAt: Number(values[r][2]) || 0
      });
    }
  }
  return list;
}

function mergeLessonsSheet(sheet, incomingLessons) {
  if (!Array.isArray(incomingLessons) || !incomingLessons.length) return;
  const values = sheet.getDataRange().getValues();
  const byDay = {};
  for (let r = 1; r < values.length; r++) {
    const day = Number(values[r][0]);
    if (!isNaN(day)) {
      byDay[day] = { rowIndex: r + 1, updatedAt: Number(values[r][2]) || 0 };
    }
  }
  const toAppend = [];
  for (let i = 0; i < incomingLessons.length; i++) {
    const entry = incomingLessons[i];
    const day = Number(entry.day);
    if (isNaN(day)) continue;
    const upd = Number(entry.updatedAt) || 0;
    const rowData = [day, clipCell(JSON.stringify(entry.subjects || [])), upd];
    const cur = byDay[day];
    if (!cur) {
      toAppend.push(rowData);
    } else if (upd >= cur.updatedAt) {
      sheet.getRange(cur.rowIndex, 1, 1, 3).setValues([rowData]);
      cur.updatedAt = upd;
    }
  }
  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 3).setValues(toAppend);
  }
}

function readMetaSheet(sheet) {
  const values = sheet.getDataRange().getValues();
  const out = {};
  for (let r = 1; r < values.length; r++) {
    const k = String(values[r][0] || '').trim();
    if (!k) continue;
    out[k] = {
      value: parseJsonSafe(values[r][1], null),
      updatedAt: Number(values[r][2]) || 0
    };
  }
  return out;
}

function mergeMetaSheet(sheet, metaEntries) {
  if (!metaEntries || typeof metaEntries !== 'object') return;
  const values = sheet.getDataRange().getValues();
  const byKey = {};
  for (let r = 1; r < values.length; r++) {
    const k = String(values[r][0] || '').trim();
    if (k) byKey[k] = { rowIndex: r + 1, updatedAt: Number(values[r][2]) || 0 };
  }
  const toAppend = [];
  const keys = Object.keys(metaEntries);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = metaEntries[key];
    if (!entry || entry.value === undefined) continue;
    const upd = Number(entry.updatedAt) || 0;
    const rowData = [key, clipCell(JSON.stringify(entry.value)), upd];
    const cur = byKey[key];
    if (!cur) {
      toAppend.push(rowData);
    } else if (upd >= cur.updatedAt) {
      sheet.getRange(cur.rowIndex, 1, 1, 3).setValues([rowData]);
      cur.updatedAt = upd;
    }
  }
  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 3).setValues(toAppend);
  }
}

function buildSnapshot(ss) {
  const snapshot = { deleted: {} };
  for (let i = 0; i < COLLECTION_TO_SHEET.length; i++) {
    const key = COLLECTION_TO_SHEET[i][0];
    const sheetName = COLLECTION_TO_SHEET[i][1];
    const res = readCollectionSheet(ss.getSheetByName(sheetName), SHEET_SCHEMA[sheetName]);
    snapshot[key] = res.active;
    snapshot.deleted[key] = res.deleted;
  }
  snapshot.lessons = readLessonsSheet(ss.getSheetByName('Lessons'));
  const meta = readMetaSheet(ss.getSheetByName('ProfileMeta'));
  if (meta.profile) {
    snapshot.profile = meta.profile.value;
    snapshot.profileUpdatedAt = meta.profile.updatedAt;
  }
  if (meta.settings) {
    snapshot.settings = meta.settings.value;
    snapshot.settingsUpdatedAt = meta.settings.updatedAt;
  }
  return snapshot;
}

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  if (!isAuthorized(token)) {
    return jsonOut({ ok: false, error: 'Unauthorized: 토큰이 일치하지 않습니다.' });
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);
  return jsonOut({
    ok: true,
    serverTime: Date.now(),
    snapshot: buildSnapshot(ss)
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const token = body.token || (e && e.parameter && e.parameter.token) || '';
    if (!isAuthorized(token)) {
      return jsonOut({ ok: false, error: 'Unauthorized: 토큰이 일치하지 않습니다.' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);

    const snap = body.snapshot || {};
    const deletedAll = snap.deleted || {};

    for (let i = 0; i < COLLECTION_TO_SHEET.length; i++) {
      const key = COLLECTION_TO_SHEET[i][0];
      const sheetName = COLLECTION_TO_SHEET[i][1];
      if (Array.isArray(snap[key]) || (deletedAll && deletedAll[key])) {
        mergeCollectionSheet(ss.getSheetByName(sheetName), SHEET_SCHEMA[sheetName], snap[key], deletedAll[key]);
      }
    }

    if (Array.isArray(snap.lessons)) {
      mergeLessonsSheet(ss.getSheetByName('Lessons'), snap.lessons);
    }

    const metaUpdates = {};
    if (snap.profile) metaUpdates.profile = { value: snap.profile, updatedAt: Number(snap.profileUpdatedAt) || Date.now() };
    if (snap.settings) metaUpdates.settings = { value: snap.settings, updatedAt: Number(snap.settingsUpdatedAt) || Date.now() };
    mergeMetaSheet(ss.getSheetByName('ProfileMeta'), metaUpdates);

    return jsonOut({
      ok: true,
      serverTime: Date.now(),
      snapshot: buildSnapshot(ss)
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
