/**
 * 조직별 인원수를 소스 시트("2. HR Data" 탭 → 2.2. 조직별인원)에서
 * 타겟 시트("Export" 탭)으로 자동 복사한다.
 *
 * 매칭 규칙:
 *   - 라벨: 소스 "구분" 컬럼의 값 ↔ 타겟 A열 값
 *          (예: "Team Leader", "Backend Dev.", "디자인" …)
 *   - 월:   소스 "N월" 헤더 ↔ 타겟 "YYYY-MM" 헤더 (MM → N으로 변환)
 *
 * 행 위치는 어디에도 하드코딩하지 않는다:
 *   - 소스: "2.2 조직별인원" 섹션 제목을 먼저 찾고, 그 아래의 "구분" 헤더 행을 찾는다.
 *           (재직자명부 표도 "구분" 헤더를 가지므로 섹션 제목으로 구분이 필요.)
 *   - 타겟: A열을 전체 스캔하여 소스 라벨과 일치하는 셀이 있는 행에 쓴다.
 *
 * 설치 위치: 타겟 스프레드시트의 확장 프로그램 > Apps Script
 *   1) 이 코드를 코드.gs에 붙여넣기 → 저장
 *   2) syncHeadcount() 1회 수동 실행 → 권한 허용
 *   3) installDailyTrigger() 1회 실행 → 매일 08시 자동 동기화
 */

const SOURCE_SHEET_ID = '1ryXEGh1CPDlQZOuMPRJ_2V0aJE-dyBsti6Z1JWeVrPc';
const SOURCE_TAB_NAME = '2. HR Data';
const SOURCE_SECTION_TITLE = /조직별\s*인원/;   // "2.2. 조직별인원"
const TARGET_TAB_NAME = 'Export';

const TARGET_HEADER_ROW = 1;
const TARGET_LABEL_COL = 1;        // A열

function syncHeadcount() {
  const src = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(SOURCE_TAB_NAME);
  if (!src) throw new Error('소스 탭을 찾을 수 없습니다: ' + SOURCE_TAB_NAME);
  const dst = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_TAB_NAME);
  if (!dst) throw new Error('타겟 탭을 찾을 수 없습니다: ' + TARGET_TAB_NAME);

  const sourceByLabel = readSource(src);
  const result = writeTarget(dst, sourceByLabel);

  const msg = result.updated + '개 셀 업데이트 / 매칭된 라벨 ' + result.matchedLabels +
              (result.unmatched.length ? ' / 타겟에서 매칭 안 됨: ' + result.unmatched.join(', ') : '');
  SpreadsheetApp.getActive().toast(msg, '인원수 동기화', 8);
  console.log(msg);
}

/**
 * 소스 시트에서 2.2. 조직별인원 표를 읽어 {label: {monthNum: value}} 형태로 반환.
 */
function readSource(src) {
  const srcAll = src.getRange(1, 1, src.getLastRow(), src.getLastColumn()).getValues();
  const section = findSectionHeader(srcAll);
  if (!section) throw new Error('소스에서 "조직별인원" 표를 찾지 못했습니다.');

  // 월 → 컬럼 인덱스(0-based)
  const monthCol = {};
  srcAll[section.row].forEach((h, idx) => {
    const m = String(h).trim().match(/^(\d{1,2})\s*월$/);
    if (m) monthCol[Number(m[1])] = idx;
  });

  // "총 인원수"를 만날 때까지 라벨/값 수집
  const byLabel = {};
  for (let r = section.row + 1; r < srcAll.length; r++) {
    const label = String(srcAll[r][section.labelCol] || '').trim();
    if (!label) continue;
    if (/^총\s*인원수$/.test(label)) break;
    const months = {};
    Object.keys(monthCol).forEach(function(month) {
      months[month] = srcAll[r][monthCol[month]];
    });
    byLabel[label] = months;
  }
  return byLabel;
}

/**
 * 타겟의 A열 전체를 스캔, 라벨이 매칭되는 행에 월별 값을 쓴다.
 */
function writeTarget(dst, sourceByLabel) {
  const dstHeaders = dst.getRange(TARGET_HEADER_ROW, 1, 1, dst.getLastColumn()).getValues()[0];
  const targetMonthCol = {};
  dstHeaders.forEach((h, idx) => {
    const month = parseTargetMonth(h);
    if (month) targetMonthCol[month] = idx + 1;   // 1-based
  });

  const dstLastRow = dst.getLastRow();
  const dstColA = dst.getRange(1, TARGET_LABEL_COL, dstLastRow, 1).getValues();

  let updated = 0;
  let matchedLabels = 0;
  const matchedSet = {};
  dstColA.forEach((row, i) => {
    const label = String(row[0] || '').trim();
    if (!label || !sourceByLabel[label]) return;
    matchedSet[label] = true;
    matchedLabels++;
    const targetRow = i + 1;
    Object.keys(targetMonthCol).forEach(function(month) {
      const val = sourceByLabel[label][month];
      if (val === '' || val === null || val === undefined) return;
      dst.getRange(targetRow, targetMonthCol[month]).setValue(val);
      updated++;
    });
  });

  const unmatched = Object.keys(sourceByLabel).filter(l => !matchedSet[l]);
  return { updated: updated, matchedLabels: matchedLabels, unmatched: unmatched };
}

/**
 * 소스에서 "2.2 조직별인원" 섹션 제목 → 그 아래의 "구분" + "N월" 헤더 행을 찾는다.
 * 반환: { row: 0-based row index, labelCol: 0-based col index of "구분" cell }
 */
function findSectionHeader(srcAll) {
  let sectionRow = -1;
  for (let i = 0; i < srcAll.length && sectionRow < 0; i++) {
    for (let j = 0; j < srcAll[i].length; j++) {
      if (SOURCE_SECTION_TITLE.test(String(srcAll[i][j]).trim())) {
        sectionRow = i;
        break;
      }
    }
  }
  if (sectionRow < 0) return null;

  // 섹션 제목 아래 최대 10행 내에서 "구분" + "1월" 동시 등장하는 헤더 행 탐색
  for (let i = sectionRow + 1; i < Math.min(sectionRow + 11, srcAll.length); i++) {
    const row = srcAll[i];
    let labelCol = -1;
    let hasJan = false;
    for (let j = 0; j < row.length; j++) {
      const v = String(row[j]).trim();
      if (v === '구분') labelCol = j;
      if (/^1\s*월$/.test(v)) hasJan = true;
    }
    if (labelCol >= 0 && hasJan) return { row: i, labelCol: labelCol };
  }
  return null;
}

/**
 * "2026-04" → 4, Date 객체 → getMonth()+1.
 */
function parseTargetMonth(header) {
  if (header instanceof Date) return header.getMonth() + 1;
  if (typeof header === 'string') {
    const m = header.match(/^\d{4}-(\d{1,2})/);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * 진단용. Apps Script 편집기에서 실행 후 "실행 로그"를 확인하면
 * 소스/타겟에서 무엇을 읽었는지, 어떤 라벨이 매칭되는지 알 수 있다.
 */
function debugSync() {
  const src = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(SOURCE_TAB_NAME);
  if (!src) { console.log('❌ 소스 탭 못 찾음: ' + SOURCE_TAB_NAME); return; }
  const dst = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_TAB_NAME);
  if (!dst) { console.log('❌ 타겟 탭 못 찾음: ' + TARGET_TAB_NAME); return; }

  const srcAll = src.getRange(1, 1, src.getLastRow(), src.getLastColumn()).getValues();
  console.log('소스 크기: ' + src.getLastRow() + 'x' + src.getLastColumn());

  const section = findSectionHeader(srcAll);
  if (!section) {
    console.log('❌ "조직별인원" 섹션 또는 "구분" 헤더를 찾지 못함.');
    return;
  }
  console.log('✅ 섹션 헤더 row=' + (section.row + 1) +
              ', labelCol=' + String.fromCharCode(65 + section.labelCol) +
              ' / 헤더 행: ' + JSON.stringify(srcAll[section.row]));

  const sourceByLabel = readSource(src);
  const srcLabels = Object.keys(sourceByLabel);
  console.log('소스 라벨 ' + srcLabels.length + '개: ' + JSON.stringify(srcLabels));

  const dstHeaders = dst.getRange(TARGET_HEADER_ROW, 1, 1, dst.getLastColumn()).getValues()[0];
  const targetMonthCol = {};
  dstHeaders.forEach((h, idx) => {
    const month = parseTargetMonth(h);
    if (month) targetMonthCol[month] = idx + 1;
  });
  console.log('타겟 헤더 row ' + TARGET_HEADER_ROW + ': ' + JSON.stringify(dstHeaders));
  console.log('타겟 월 컬럼 맵: ' + JSON.stringify(targetMonthCol));

  const dstColA = dst.getRange(1, TARGET_LABEL_COL, dst.getLastRow(), 1).getValues()
    .map((r, i) => ({ row: i + 1, label: String(r[0] || '').trim() }))
    .filter(o => o.label);
  console.log('타겟 A열 비어있지 않은 라벨 ' + dstColA.length + '개:');
  dstColA.forEach(o => {
    const hit = sourceByLabel[o.label] ? '✅' : '  ';
    console.log('  ' + hit + ' A' + o.row + ': ' + o.label);
  });

  const matched = dstColA.filter(o => sourceByLabel[o.label]).map(o => o.label);
  const dstLabelSet = {};
  dstColA.forEach(o => { dstLabelSet[o.label] = true; });
  const srcOnly = srcLabels.filter(l => !dstLabelSet[l]);
  console.log('매칭 ' + matched.length + '개: ' + JSON.stringify(matched));
  if (srcOnly.length) console.log('⚠️ 소스에만 있고 타겟 A열에 없음: ' + JSON.stringify(srcOnly));
}

/**
 * 매일 08:00 자동 동기화 트리거 설치(기존 트리거는 제거 후 재설치).
 */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncHeadcount') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncHeadcount')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  console.log('매일 08시 syncHeadcount 트리거 설치 완료');
}

/**
 * 메뉴에서 수동 실행하고 싶을 때.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('인원수 동기화')
    .addItem('지금 동기화', 'syncHeadcount')
    .addItem('진단 실행 (로그 확인)', 'debugSync')
    .addItem('매일 08시 자동 실행 설치', 'installDailyTrigger')
    .addToUi();
}
