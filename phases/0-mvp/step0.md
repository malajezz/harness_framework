# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/Users/jekismac/Projects/harness_framework/CLAUDE.md`
- `/Users/jekismac/Projects/harness_framework/docs/PRD.md`
- `/Users/jekismac/Projects/harness_framework/docs/ARCHITECTURE.md`
- `/Users/jekismac/Projects/harness_framework/docs/ADR.md`
- `/Users/jekismac/Projects/harness_framework/.env.example`

## 작업

이 저장소 루트(`/Users/jekismac/Projects/harness_framework`)에 Next.js 15 앱을 **현재 디렉토리에** 구성한다. 이미 `docs/`, `phases/`, `scripts/`, `.git`, `.env.example`, `.env.local`, `CLAUDE.md`, `.gitignore`가 존재하므로 이를 **삭제하거나 덮어쓰지 말고** 그 위에 Next.js 프로젝트를 얹는다.

1. **Next.js 프로젝트 생성**
   - App Router, TypeScript, Tailwind CSS, ESLint 사용. `src/` 디렉토리 구조 사용. import alias `@/*`.
   - `create-next-app`이 비어있지 않은 디렉토리라 거부하면, 임시 디렉토리에 생성 후 필요한 파일(`package.json`, `tsconfig.json`, `next.config.*`, `postcss.config.*`, `eslint.config.*`, `src/app/*`, `public/*` 등)만 루트로 옮긴다. 기존 파일은 보존한다.
   - TypeScript는 strict mode(`"strict": true`).

2. **의존성 추가**: `@anthropic-ai/sdk`를 설치한다.

3. **디렉토리 골격 생성** (빈 상태로, 다음 step들이 채운다):
   - `src/types/`, `src/lib/`, `src/services/`, `src/components/`, `src/app/api/analyze/`

4. **환경변수 로딩 헬퍼** — `src/lib/env.ts`를 만들고 아래 시그니처를 제공한다. 서버에서만 호출된다.
   ```ts
   // 누락 시 명확한 에러 메시지를 throw (어떤 키가 없는지, .env.local에 넣으라고 안내)
   export function getYoutubeApiKey(): string
   export function getAnthropicApiKey(): string
   ```
   `process.env.YOUTUBE_API_KEY` / `process.env.ANTHROPIC_API_KEY`를 읽는다. `NEXT_PUBLIC_` 접두사를 쓰지 마라.

5. **기본 페이지 정리**: `src/app/page.tsx`는 "TubeNext" 제목과 한 줄 설명만 있는 최소 플레이스홀더로 둔다(실제 UI는 step5). `src/app/globals.css`는 Tailwind 지시문 + 배경 `#0a0a0a`/기본 텍스트 흰색만 설정.

6. **scripts 확인**: `package.json`에 `dev`, `build`, `lint`, `test` 스크립트가 있어야 한다. `test`가 없으면 임시로 `"test": "echo \"no tests yet\" && exit 0"`를 넣는다(step2에서 실제 테스트 러너로 교체).

## Acceptance Criteria

```bash
npm install
npm run build   # 컴파일/빌드 에러 없음
npm run lint    # 린트 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `src/` 하위 디렉토리 구조가 ARCHITECTURE.md와 일치하는가?
   - 기존 `docs/`, `phases/`, `scripts/`, `.env*`, `CLAUDE.md`, `.gitignore`가 보존되었는가?
   - `.env.local`이 `.gitignore` 처리되는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약(생성된 핵심 파일 포함)"`
   - 3회 시도 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 중단

## 금지사항

- 기존 `docs/`, `phases/`, `scripts/`, `.git`, `CLAUDE.md`, `.env.example`, `.env.local`, `.gitignore`를 삭제·초기화하지 마라. 이유: 프로젝트 가드레일과 사용자 키 자리가 사라진다.
- `.env.local`에 실제 키 값을 넣지 마라(빈 채로 둔다). 이유: 키는 사용자가 채운다.
- API 키를 `NEXT_PUBLIC_`으로 노출하지 마라. 이유: 클라이언트 번들에 키가 박힌다.
- 이 step에서 실제 분석/UI 로직을 구현하지 마라. 이유: 후속 step의 범위다.
