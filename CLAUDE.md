# CLAUDE.md

This file provides guidance to AI assistants working in this repository.

## Project Overview

- **Purpose**: 사내 계약 등록·갱신·통지 자동화 봇. 사용자가 Slack에서
  `/계약봇` 입력 → 모달로 계약 정보 입력 → Notion DB에 한 행으로 적재 →
  매일 09:00 KST에 갱신/통지/만료 시점이 오늘인 계약을 찾아 관계자에게 자동
  Slack DM을 발송한다.
- **Stack**: Slack 앱 + n8n Cloud(워크플로 자동화) + Notion DB. 이 레포에는
  실행 가능한 코드가 없으며, 외부 시스템에 import/붙여넣기 할 **설정 파일과
  가이드** 만 들어 있다.
- **메인 가이드**: 셋업은 `SETUP.md` 한 문서를 처음부터 끝까지 따른다.

---

## Setup

이 레포 자체는 빌드/실행 대상이 아니다. 셋업은 모두 외부 시스템(Slack/
n8n Cloud/Notion)에서 이뤄지며, `SETUP.md` 의 STEP 1~8을 그대로 따라가면
약 45분 안에 완료된다.

필수 산출 값(모두 외부 서비스에서 받음, `.env.example` 참고):

- `SLACK_BOT_TOKEN` — Slack 앱의 Bot User OAuth Token
- `NOTION_TOKEN` — Notion Internal Integration Secret
- `NOTION_DATABASE_ID` — Notion "계약 관리" DB의 32자 ID
- `N8N_WEBHOOK_URL_A`, `N8N_WEBHOOK_URL_B` — n8n 워크플로 활성화 시 자동 생성

> ⚠️ `N8N_WEBHOOK_URL_A` 와 `B` 는 반드시 서로 다른 주소여야 한다. 같은
> 주소를 양쪽에 넣으면 모달 제출이 동작하지 않는다 (이 레포의 시작 사례).

---

## Project Structure

```
projection/
├── CLAUDE.md                                  # 이 파일
├── SETUP.md                                   # 셋업 메인 가이드 (먼저 읽기)
├── .env.example                               # 필요한 시크릿/식별자 목록
├── slack/
│   ├── manifest.yaml                          # Slack 앱 매니페스트
│   └── modal-view.json                        # 계약 등록 모달 view payload
├── notion/
│   └── schema.md                              # Notion DB 컬럼·뷰 정의
└── n8n/
    ├── README.md                              # n8n Cloud import 가이드
    ├── workflow-A-open-modal.json             # /계약봇 → 모달 열기
    ├── workflow-B-submit-to-notion.json       # 제출 → Notion + DM
    └── workflow-C-daily-reminder.json         # 매일 09:00 → 알림 발사
```

---

## Architecture & Key Conventions

### 데이터 흐름

```
Slack /계약봇  ──►  n8n Workflow A  ──► Slack views.open  ──► 모달
                                                              │
모달 제출 ──►  n8n Workflow B  ──►  Notion 페이지 생성 ──► 등록자 DM
                                                              
매일 09:00 ──► n8n Workflow C ──► Notion 쿼리(오늘=알림일) ──► 관계자 DM
                                                              └─► 만료건은 상태=만료
```

### 컬럼·필드 매핑 규약

Slack 모달 `block_id` ↔ Notion 컬럼명 ↔ 워크플로 B의 파싱 키는 1:1로
대응된다. 새 필드를 추가할 때는 다음 네 곳을 모두 동시에 수정해야 한다:

1. `slack/modal-view.json` 의 새 input block
2. `n8n/workflow-A-open-modal.json` 안에 embed된 modal view JSON (워크플로
   A는 `slack/modal-view.json` 을 직접 읽지 않고 인라인으로 들고 있다)
3. `n8n/workflow-B-submit-to-notion.json` 의 `모달 입력값 파싱` Code 노드
4. `notion/schema.md` 의 컬럼 정의 + 실제 Notion DB 컬럼

### Slack 매니페스트 두 URL은 반드시 다르다

`slash_commands[].url` (워크플로 A) 와 `settings.interactivity.request_url`
(워크플로 B) 은 반드시 서로 다른 n8n Webhook URL이어야 한다. 매니페스트
편집 시 이 불변식을 깨뜨리지 말 것.

### Git Workflow

- Branch naming: `feature/<description>`, `fix/<description>`,
  `chore/<description>`. 본 레포의 최초 셋업은
  `claude/slack-contract-bot-bjTic` 브랜치에서 진행되었다.
- Commit style: 명령형 한국어/영어 모두 가능. 변경 의도를 1~2문장으로.

---

## AI Assistant Guidelines

When working in this repository, AI assistants should:

1. **Read before editing** — Always read a file before modifying it to understand existing patterns.
2. **Stay minimal** — Only make changes that are directly requested or clearly necessary. Avoid over-engineering.
3. **No speculative additions** — Do not add docstrings, comments, error handling, or features that were not requested.
4. **Prefer editing over creating** — Modify existing files rather than creating new ones when possible.
5. **Run tests before committing** — Verify changes do not break existing functionality.
6. **Update this file** — When significant new patterns, commands, or architectural decisions are introduced, update the relevant section of `CLAUDE.md`.
7. **Environment secrets** — Never commit `.env` files or secrets. Use `.env.example` with placeholder values.

---

## Frequently Asked Questions

_Add Q&A entries here as recurring questions arise during development._
