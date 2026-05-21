/**
 * 조직별 인원수를 소스 시트("2. HR Data" 탭 → 2.2 조직별인원)에서
 * 타겟 시트("Export" 탭)으로 자동 복사한다.
 *
 * 매칭 규칙:
 *   - 라벨: 소스 B열 ↔ 타겟 A열 (예: "Team Leader", "Backend Dev.", "디자인" …)
 *   - 월:   소스 "N월" 헤더 ↔ 타겟 "YYYY-MM" 헤더 (MM → N으로 변환)
 *
 * 설치 위치: 타겟 스프레드시트의 확장 프로그램 > Apps Script
 *   1) 이 코드를 코드.gs에 붙여넣기
 *   2) syncHeadcount() 1회 수동 실행 → 권한 허용
 *   3) installDailyTrigger() 1회 실행 → 매일 08시 자동 동기화
 */

const SOURCE_SHEET_ID = '1ryXEGh1CPDlQZOuMPRJ_2V0aJE-dyBsti6Z1JWeVrPc';
const SOURCE_TAB_NAME = '2. HR Data';
const TARGET_TAB_NAME = 'Export';

const TARGET_HEADER_ROW = 1;
const TARGET_LABEL_COL = 1;        // A열
const TARGET_DATA_FIRST_ROW = 17;  // A17부터 라벨 시작
const TARGET_DATA_LAST_ROW = 37;   // A37까지

function syncHeadcount() {
  const src = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(SOURCE_TAB_NAME);
  if (!src) throw new Error('소스 탭을 찾을 수 없습니다: ' + SOURCE_TAB_NAME);
  const dst = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_TAB_NAME);
  if (!dst) throw new Error('타겟 탭을 찾을 수 없습니다: ' + TARGET_TAB_NAME);

  const srcAll = src.getRange(1, 1, src.getLastRow(), src.getLastColumn()).getValues();

  const headerRow = findSectionHeaderRow(srcAll);
  if (headerRow < 0) throw new Error('소스에서 "조직별인원" 표(구분 + N월 헤더)를 찾지 못했습니다.');

  // 소스 월 → 컬럼 인덱스(0-based)
  const sourceMonthCol = {};
  srcAll[headerRow].forEach((h, idx) => {
    const m = String(h).trim().match(/^(\d{1,2})월$/);
    if (m) sourceMonthCol[Number(m[1])] = idx;
  });

  // 소스 라벨 → {월: 값}
  const sourceByLabel = {};
  for (let r = headerRow + 1; r < srcAll.length; r++) {
    const label = String(srcAll[r][1] || '').trim();
    if (!label) break;
    if (label === '총 인원수' || label === '총인원수') break;
    const months = {};
    Object.keys(sourceMonthCol).forEach(function(month) {
      months[month] = srcAll[r][sourceMonthCol[month]];
    });
    sourceByLabel[label] = months;
  }

  // 타겟 헤더(월) → 컬럼 인덱스(1-based)
  const dstHeaders = dst.getRange(TARGET_HEADER_ROW, 1, 1, dst.getLastColumn()).getValues()[0];
  const targetMonthCol = {};
  dstHeaders.forEach((h, idx) => {
    const month = parseTargetMonth(h);
    if (month) targetMonthCol[month] = idx + 1;
  });

  // 타겟 라벨 읽기
  const dstLabels = dst
    .getRange(TARGET_DATA_FIRST_ROW, TARGET_LABEL_COL,
              TARGET_DATA_LAST_ROW - TARGET_DATA_FIRST_ROW + 1, 1)
    .getValues();

  // 쓰기 — 값을 모아서 setValues로 한 번에 쓰면 빠르지만,
  // 빈 셀(소스에 데이터 없음)은 건드리지 않도록 셀 단위 setValue 사용.
  let updated = 0;
  const skipped = [];
  dstLabels.forEach((row, i) => {
    const label = String(row[0] || '').trim();
    if (!label) return;
    if (!sourceByLabel[label]) {
      skipped.push(label);
      return;
    }
    const targetRow = TARGET_DATA_FIRST_ROW + i;
    Object.keys(targetMonthCol).forEach(function(month) {
      const val = sourceByLabel[label][month];
      if (val === '' || val === null || val === undefined) return;
      dst.getRange(targetRow, targetMonthCol[month]).setValue(val);
      updated++;
    });
  });

  const msg = updated + '개 셀 업데이트' +
              (skipped.length ? ' / 매칭 안 됨: ' + skipped.join(', ') : '');
  SpreadsheetApp.getActive().toast(msg, '인원수 동기화', 8);
  console.log(msg);
}

/**
 * 소스 시트에서 "구분" + "N월" 헤더가 함께 있는 행(=조직별인원 표 헤더)을 찾는다.
 */
function findSectionHeaderRow(srcAll) {
  for (let i = 0; i < srcAll.length; i++) {
    const row = srcAll[i];
    const hasGubun = row.some(c => String(c).trim() === '구분');
    const hasJan = row.some(c => String(c).trim() === '1월');
    if (hasGubun && hasJan) return i;
  }
  return -1;
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
    .addItem('매일 08시 자동 실행 설치', 'installDailyTrigger')
    .addToUi();
}
