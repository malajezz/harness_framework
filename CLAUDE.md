# 프로젝트: TubeNext — YouTube 컨텐츠 분석 & 차기 컨텐츠 추천

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- @anthropic-ai/sdk (Claude API)
- YouTube Data API v3 (REST, fetch)

## 아키텍처 규칙
- CRITICAL: 외부 API(YouTube Data API, Claude API) 호출은 **반드시 `src/app/api/` 라우트 핸들러(서버)에서만** 처리한다. 클라이언트 컴포넌트에서 직접 호출 금지.
- CRITICAL: API 키는 서버 환경변수(`process.env.YOUTUBE_API_KEY`, `process.env.ANTHROPIC_API_KEY`)로만 읽는다. `NEXT_PUBLIC_` 접두사를 붙이지 마라(키가 번들에 노출됨).
- 외부 API 래퍼는 `src/services/`에, 순수 유틸/계산 로직은 `src/lib/`에, 도메인 타입은 `src/types/`에 분리한다.
- 클라이언트는 자체 API 라우트(`/api/analyze`)만 호출한다.

## 개발 프로세스
- 순수 계산 로직(viral 점수 등)은 단위 테스트를 작성한다. UI/외부 API 호출 레이어는 MVP에서 테스트 생략 가능.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
