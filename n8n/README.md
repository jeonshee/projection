# n8n Cloud 연동 가이드

이 폴더에는 계약봇이 동작하는 데 필요한 n8n 워크플로 3개의 JSON이 있습니다.
이 문서를 따라 n8n Cloud에 import → Credentials 등록 → Webhook 활성화까지
진행하세요.

## 0. 워크플로 개요

| 파일 | 트리거 | 역할 |
|---|---|---|
| `workflow-A-open-modal.json` | Webhook (Slack 슬래시 커맨드) | `/계약봇` 입력 시 모달을 띄움 |
| `workflow-B-submit-to-notion.json` | Webhook (Slack Interactivity) | 모달 제출 → Notion에 한 행 추가 + 등록자에게 DM |
| `workflow-C-daily-reminder.json` | Schedule (매일 09:00 KST) | 오늘이 갱신·통지·만료일인 계약을 찾아 담당자에게 DM |

> 워크플로 A와 B의 Webhook URL은 **반드시 서로 달라야 합니다.** Slack 앱
> 설정에서 슬래시 커맨드와 Interactivity를 같은 URL로 두면 모달이 안 뜨거나
> 제출이 안 됩니다.

---

## 1. n8n Cloud에 워크플로 Import

1. https://app.n8n.cloud 로그인
2. 좌측 사이드바 **Workflows** 클릭
3. 우상단 **Add workflow ▾** → **Import from File** 선택
4. 이 폴더의 JSON 3개를 차례로 import (한 번에 하나씩)
5. import 후 워크플로 이름이 다음과 같이 보이면 정상:
   - 계약봇 A — 모달 열기
   - 계약봇 B — 모달 제출 → Notion 적재
   - 계약봇 C — 매일 알림 발사

---

## 2. Credentials 등록

n8n 좌측 사이드바 **Credentials** → **Add credential**.

### 2-1. Slack Bot Token (Header Auth)
- Credential type: **Header Auth**
- Name: `Slack Bot Token`
- Header Name: `Authorization`
- Header Value: `Bearer xoxb-...` ← Slack 앱에서 받은 Bot User OAuth Token
  앞에 반드시 `Bearer ` 를 붙이세요 (공백 1칸 포함)

### 2-2. Notion Integration Token (Header Auth)
- Credential type: **Header Auth**
- Name: `Notion Integration Token`
- Header Name: `Authorization`
- Header Value: `Bearer secret_...` ← Notion Integration Secret 앞에 `Bearer `

### Credential을 워크플로에 다시 연결
import 직후에는 워크플로 안 HTTP Request 노드들이 "Credential not found"
경고를 보일 수 있습니다. 각 노드를 열어 **Credential** 드롭다운에서 위에서
만든 두 Credential을 선택해 주세요.

해당하는 노드:
- 워크플로 A: `Slack views.open 호출` → Slack Bot Token
- 워크플로 B: `Notion 페이지 생성` → Notion Integration Token, `등록자에게
  DM` → Slack Bot Token
- 워크플로 C: `Notion DB 조회 (오늘이 알림일)`, `Notion 상태 → 만료` →
  Notion Integration Token, `담당자에게 DM` → Slack Bot Token

---

## 3. 환경 변수 (NOTION_DATABASE_ID)

워크플로 B와 C는 `$env["NOTION_DATABASE_ID"]` 표현으로 Notion DB ID를
참조합니다. n8n Cloud에서 환경 변수 설정 방법:

- **n8n Cloud (Pro/Business 플랜)**: Settings → Variables → **Add variable**
  - Key: `NOTION_DATABASE_ID`
  - Value: 32자리 Database ID (notion/schema.md 참고)
- **n8n Cloud Starter 플랜처럼 Variables를 못 쓰는 경우**: 워크플로 B와 C의
  HTTP Request 노드에서 `{{$env["NOTION_DATABASE_ID"]}}` 부분을 실제 DB ID
  문자열로 직접 치환해 주세요.

---

## 4. Webhook URL 활성화 & 복사

워크플로 A와 B에는 각각 Webhook 노드가 있습니다.

1. 워크플로 A를 엽니다.
2. **Slack 슬래시 커맨드 수신** 노드 클릭.
3. 노드 우측 패널의 **Production URL** 옆 복사 아이콘 클릭. (Test URL 아님!)
4. 우상단 **Inactive** 토글을 **Active** 로 변경.
5. 워크플로 B에서도 동일하게 **Slack Interactivity 수신** 노드 → Production
   URL 복사 → Active로 전환.

> 두 URL은 서로 다른 path(`contract-bot-slash` vs `contract-bot-submit`)를
> 가지므로 서로 다른 주소가 됩니다. 이 두 URL을 메모해 두세요. SETUP.md에서
> Slack 앱 매니페스트의 두 빈칸에 붙여넣게 됩니다.

워크플로 C는 Cron 트리거라 별도 URL이 없습니다. 검증이 끝나기 전까지는
Active로 켜지 마세요(예상치 못한 시간에 DM이 갈 수 있음).

---

## 5. Slack credential ID 정리 (선택)

import한 JSON에는 `REPLACE_WITH_SLACK_CREDENTIAL_ID` /
`REPLACE_WITH_NOTION_CREDENTIAL_ID` 같은 placeholder 문자열이 들어 있습니다.
n8n UI에서 Credential을 다시 선택하면 자동으로 실제 ID로 교체되니, JSON을
직접 손으로 수정할 필요는 없습니다.

---

## 6. 디버깅 팁

- **Webhook이 호출됐는지 확인**: 워크플로 좌측 **Executions** 탭에서 최근
  실행 기록을 볼 수 있습니다. 실패한 실행을 클릭하면 어느 노드에서 멈췄는지,
  무슨 에러가 떴는지 보입니다.
- **Slack에서 호출 흔적이 없다면**: Slack 앱 매니페스트의 URL이 잘못된
  것입니다. SETUP.md STEP 4 다시 확인.
- **Notion이 401**: 토큰 앞에 `Bearer ` 누락. 또는 Notion DB에 Integration
  연결 안 됨.
- **Notion이 404**: Database ID 오타. 또는 Integration이 그 DB에 권한 없음.
- **Slack DM이 안 옴**: Bot에 `chat:write` 와 `im:write` 스코프 있는지,
  봇 사용자가 활성화되어 있는지 확인.
