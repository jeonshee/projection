# 계약봇 셋업 가이드 (비개발자용)

이 문서를 처음부터 끝까지 따라가면 **`/계약봇` 슬랙 명령어 → 모달 입력 →
Notion에 자동 적재 + 갱신·만료 시점 자동 알림** 까지 동작합니다.

소요 시간: **약 45분**.
필요한 것: Slack 워크스페이스 관리자 권한, n8n Cloud 계정, Notion 워크스페이스.

---

## 한눈에 보는 흐름

```
[Slack /계약봇]
   │
   ▼
[n8n 워크플로 A] ── views.open ──► [Slack 모달]
                                       │ (제출)
                                       ▼
                              [n8n 워크플로 B] ──► [Notion DB 1행 추가]
                                       │
                                       └─► [등록자에게 DM]

[매일 09:00 KST]
   │
   ▼
[n8n 워크플로 C] ── 오늘이 갱신/통지/만료일인 행 검색 ──► [관계자 모두 DM]
```

---

## 사전 준비 체크리스트

- [ ] Slack 워크스페이스 관리자(또는 앱 설치 권한 보유)
- [ ] n8n Cloud 계정 (https://app.n8n.cloud)
- [ ] Notion 워크스페이스 + 멤버 권한
- [ ] 이 레포의 파일들 (이 저장소를 클론하거나 GitHub에서 직접 열어 두세요)

---

## STEP 1 — Notion DB 만들기 + 뷰 4개 + Integration 연결

`notion/schema.md` 문서를 그대로 따라 합니다. 끝나면 다음 두 값을
메모해 두세요:

- **Notion Integration Token** (`secret_...` 형태)
- **Notion Database ID** (32자 영숫자)

> ⚠️ Integration을 만든 뒤 DB의 `···` → **Connections** 메뉴에서 그
> Integration을 추가하지 않으면 n8n이 401/404 에러를 냅니다. 가장 흔한 실수.

---

## STEP 2 — n8n Cloud에 워크플로 3개 Import

`n8n/README.md` 의 1~3번 섹션을 따라 진행합니다.

1. n8n Cloud 로그인 → **Workflows** → **Import from File**
2. `n8n/workflow-A-open-modal.json`, `workflow-B-submit-to-notion.json`,
   `workflow-C-daily-reminder.json` 세 개를 각각 import
3. **Credentials** 메뉴에서 다음 두 개 등록:
   - `Slack Bot Token` (Header Auth, value: `Bearer xoxb-...`) — 토큰은 STEP 4
     이후에 받게 되므로 일단 **임시값**(예: `Bearer placeholder`)으로 만들고
     STEP 5에서 갱신해도 됩니다.
   - `Notion Integration Token` (Header Auth, value: `Bearer secret_...`)
     ← STEP 1에서 받은 값
4. n8n **Variables**에 `NOTION_DATABASE_ID` 추가 (Starter 플랜이라 Variables
   를 못 쓰는 경우 워크플로 B·C 안의 `{{$env["NOTION_DATABASE_ID"]}}`
   부분을 직접 32자 ID로 치환)
5. 각 노드의 Credential 드롭다운에서 위에서 만든 것을 선택

---

## STEP 3 — n8n Webhook URL 2개 복사

1. **워크플로 A** 열기 → `Slack 슬래시 커맨드 수신` 노드 클릭
2. 우측 패널의 **Production URL** 복사 (Test URL 아님!)
3. 우상단 토글을 **Active** 로 전환
4. 메모장에 다음과 같이 붙여넣기:
   ```
   N8N_WEBHOOK_URL_A = https://...n8n.cloud/webhook/contract-bot-slash
   ```
5. **워크플로 B** 도 동일하게 → `Slack Interactivity 수신` 노드 → Production
   URL 복사 → Active 전환:
   ```
   N8N_WEBHOOK_URL_B = https://...n8n.cloud/webhook/contract-bot-submit
   ```

> 두 URL은 path가 달라 서로 다른 주소여야 합니다. 같으면 STEP 4가 잘못된
> 것입니다. 워크플로 C는 Cron 트리거라 URL이 없습니다 — 지금은 **Active로
> 켜지 마세요** (검증 끝나기 전까지).

---

## STEP 4 — 기존 Slack 앱 매니페스트 교체 (앱 삭제 X)

1. https://api.slack.com/apps 접속 → 기존에 만들어둔 계약봇 앱 클릭
2. 좌측 사이드바 **App Manifest** 클릭
3. 화면에 보이는 기존 YAML 전체를 지우고, 이 레포의 `slack/manifest.yaml`
   내용을 통째로 붙여넣기
4. 붙여넣은 YAML에서 두 자리를 STEP 3의 값으로 교체:
   - `<<REPLACE_WITH_N8N_WEBHOOK_A>>` → `N8N_WEBHOOK_URL_A`
   - `<<REPLACE_WITH_N8N_WEBHOOK_B>>` → `N8N_WEBHOOK_URL_B`
5. 우상단 **Save Changes** 클릭
6. "Reinstall your app to apply scope changes" 같은 노란 배너가 뜨면
   클릭 → **Reinstall to Workspace** → 권한 동의

> 이 방식은 앱을 삭제하지 않고 **설정만 덮어쓰기** 합니다. 토큰·앱 ID·설치
> 상태가 그대로 유지되므로 기존 작업이 헛수고가 되지 않습니다.

---

## STEP 5 — Slack Bot Token을 n8n에 저장

1. Slack 앱 페이지 좌측 **OAuth & Permissions** 클릭
2. 상단 **Bot User OAuth Token** (`xoxb-...`) 복사
3. n8n의 **Credentials** → `Slack Bot Token` 열기
4. Header Value를 `Bearer <복사한 토큰>` 으로 갱신 → **Save**

> 재설치 시 토큰이 바뀔 수 있으니 STEP 4 이후 반드시 한 번 새로 복사하세요.

---

## STEP 6 — Notion 토큰 / DB ID 확인

STEP 1에서 받아둔 두 값이 다음 위치에 잘 들어갔는지 확인:

- n8n Credentials의 `Notion Integration Token` ← Notion Token
- n8n Variables의 `NOTION_DATABASE_ID` ← Database ID (혹은 워크플로 B/C에
  직접 치환했다면 그 값)

---

## STEP 7 — End-to-end 검증

1. Slack에서 아무 채널에 들어가 `/계약봇` 입력 후 엔터
2. **5~10초 안에 모달이 떠야 합니다.**
3. 가짜 데이터로 한 건 입력 (계약 종료일은 적당히 오늘로 잡으면 STEP 8 검증
   때 활용 가능):
   - 거래처명: `테스트사`
   - 서비스명: `테스트 서비스`
   - 시작일/종료일/업무 담당자(본인)
4. **등록** 클릭
5. 다음 두 가지가 일어나야 함:
   - Notion "계약 관리" DB에 새 행 1개 생성 (캘린더 뷰에도 같이 보임)
   - 본인 Slack에 "✅ 계약 등록이 완료되었습니다" DM 도착

### 잘 안 되면

| 증상 | 가장 흔한 원인 |
|---|---|
| `/계약봇` 입력해도 아무 일도 없음 | Slack 매니페스트의 `slash_commands.url` 이 워크플로 A를 안 가리킴. 또는 워크플로 A가 Inactive |
| 모달은 뜨는데 제출 후 닫히지도 않음 | Interactivity URL이 잘못됨 (이번 사용자 케이스의 원래 문제). STEP 3·4 다시 확인 |
| 모달 제출 후 모달은 닫히는데 Notion에 안 보임 | Notion Integration이 DB에 연결 안 됨, 또는 Database ID 오타 |
| Notion에는 들어가는데 DM이 안 옴 | 봇 토큰이 옛날 것이거나 `chat:write`/`im:write` 스코프 없음 → STEP 5 다시 |
| 한글 컬럼명에서 401 에러 | n8n Credential의 Authorization 값에 `Bearer ` (공백 1칸 포함) 안 붙임 |

n8n 좌측 워크플로 → **Executions** 탭에서 실패한 실행을 클릭하면 어느
노드에서 어떤 에러가 났는지 정확히 보입니다.

---

## STEP 8 — 알림 워크플로 수동 테스트 (Cron 활성화 전)

1. **워크플로 C** 열기
2. 캔버스 우상단 **Execute Workflow** (▶) 버튼 클릭 (Active 전환은 아직
   하지 마세요)
3. Notion DB에 오늘 날짜와 일치하는 `갱신 알림일`/`거래처 통지일`/`계약종료일`
   행이 있다면, 해당 등록자/업무 담당자/추가 알림 대상 모두에게 DM이
   도착해야 합니다.
4. 만료일이 오늘인 행은 Notion에서 **상태 = 만료** 로 자동 변경됩니다.
5. 정상 동작이 확인되면 워크플로 C 우상단 토글을 **Active** 로 전환하세요.
   이제 매일 09:00 KST에 자동 실행됩니다.

> 알림 시각을 바꾸고 싶다면 워크플로 C의 `매일 09:00 KST 트리거` 노드 →
> Cron Expression 수정. 예: `0 0 18 * * *` = 매일 18:00.

---

## 운영 중 자주 묻는 질문

**Q1. 알림이 도착하지 않아요.**
워크플로 C의 Executions를 먼저 봅니다. (1) 그날 실행 자체가 없으면 워크플로
C가 Inactive입니다. (2) 실행은 됐는데 DM이 0건이면 Notion DB에 오늘 날짜와
일치하는 행이 없거나, 알림 대상 컬럼이 비어 있는 것입니다.

**Q2. 첨부파일을 슬랙에서 바로 올리고 싶어요.**
Slack 모달은 파일 업로드를 지원하지 않습니다. 등록 완료 DM에 있는 Notion
페이지 링크를 눌러 거기에 직접 올리면 됩니다. (권장 운영 방식)

**Q3. 모달 필드를 더 추가/제거하고 싶어요.**
`slack/modal-view.json` 의 블록을 편집한 뒤 그 내용을 `n8n/workflow-A-...json`
의 `Slack views.open 호출` 노드의 `jsonBody.view` 안에 똑같이 반영하세요.
새 필드를 Notion에 저장하려면 `notion/schema.md` 에 컬럼을 추가하고 워크플로
B의 `모달 입력값 파싱` 코드와 `Notion 페이지 생성` 노드 본문에서 매핑을
추가합니다.

**Q4. 등록자가 누군지 자동으로 채워지는 게 맞나요?**
네. 모달 제출자(`payload.user.id`)를 자동으로 "등록 담당자"에 넣습니다.
입력 필드가 따로 없는 이유입니다.

**Q5. 캘린더 뷰는 어떻게 보나요?**
Notion DB 좌상단 뷰 탭에서 **만료 캘린더** 또는 **알림 캘린더** 탭을 클릭.

---

## 참고 파일 목록

| 파일 | 용도 |
|---|---|
| `slack/manifest.yaml` | Slack 앱 매니페스트. STEP 4에서 붙여넣기 |
| `slack/modal-view.json` | 모달 양식 정의. 워크플로 A 안에 이미 embed되어 있음 (참고용) |
| `notion/schema.md` | Notion DB 컬럼·뷰 정의 + 생성 절차 |
| `n8n/workflow-A-open-modal.json` | `/계약봇` → 모달 |
| `n8n/workflow-B-submit-to-notion.json` | 모달 제출 → Notion + DM |
| `n8n/workflow-C-daily-reminder.json` | 매일 09:00 → 알림 발사 |
| `n8n/README.md` | n8n Cloud import 상세 |
| `.env.example` | 어떤 값들이 어디에 들어가는지 한눈에 보기 |

---

## v2에서 고려할 것 (지금은 안 해도 됨)

- "만료 30일 전 자동 계산" 옵션 (모달에서 직접 날짜를 넣는 대신)
- 다국가/다통화 지원
- Slack 메시지에서 첨부파일 직접 업로드 (별도 스레드 인터랙션 필요)
- 계약 갱신 시 기존 행 복제·새 시작일 입력 단축 흐름
- Notion 멘션(`@사용자`)을 페이지 본문 코멘트에 삽입
