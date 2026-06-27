# 프로젝트: TubeNext — YouTube 컨텐츠 분석 & 차기 컨텐츠 추천

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- @anthropic-ai/claude-agent-sdk (Claude — 이 기기의 Claude Code 구독 자격증명으로 인증)
- YouTube Data API v3 (REST, fetch)

## 아키텍처 규칙
- CRITICAL: 외부 API(YouTube Data API, Claude) 호출은 **반드시 `src/app/api/` 라우트 핸들러(서버)에서만** 처리한다. 클라이언트 컴포넌트에서 직접 호출 금지.
- CRITICAL: YouTube API 키는 서버 환경변수(`process.env.YOUTUBE_API_KEY`)로만 읽는다. `NEXT_PUBLIC_` 접두사를 붙이지 마라(키가 번들에 노출됨).
- CRITICAL: Claude는 별도 API 키 없이 `@anthropic-ai/claude-agent-sdk`가 Claude Code 구독 자격증명으로 인증한다. `ANTHROPIC_API_KEY`를 설정하지 마라(설정 시 구독보다 우선되어 종량제 과금됨).
- 외부 API 래퍼는 `src/services/`에, 순수 유틸/계산 로직은 `src/lib/`에, 도메인 타입은 `src/types/`에 분리한다.
- 클라이언트는 자체 API 라우트(`/api/analyze`)만 호출한다.

## 배포 전환 경로 (revert path)
현재 Claude 인증은 **로컬 전용**(구독 OAuth는 이 기기의 Claude Code 자격증명 기반)이라 서버리스/멀티유저 배포에 부적합하다. 배포가 필요해지면 Messages API + API 키로 되돌린다:
1. `src/services/claude.ts`를 `@anthropic-ai/sdk`(Messages API, 강제 tool_use) 방식으로 복원 — 전환 직전 구현이 git history에 있음(`feat: Claude를 Agent SDK 구독 인증으로 전환` 커밋의 부모).
2. `src/lib/env.ts`에 `getAnthropicApiKey()` 복원.
3. 배포 환경변수에 `ANTHROPIC_API_KEY` 설정(이때는 종량제 과금이 정상).
4. `package.json`에서 `@anthropic-ai/claude-agent-sdk` 제거 가능, `@anthropic-ai/sdk` 유지.

## 개발 프로세스
- 순수 계산 로직(viral 점수 등)은 단위 테스트를 작성한다. UI/외부 API 호출 레이어는 MVP에서 테스트 생략 가능.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
