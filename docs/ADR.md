# Architecture Decision Records

## 철학
MVP 속도 최우선. 외부 의존성 최소화. 작동하는 최소 구현을 선택한다. 저장/인증 없이 요청당 실시간 조회로 단순하게 유지한다.

---

### ADR-001: Next.js 15 App Router 선택
**결정**: Next.js 15 App Router + TypeScript strict + Tailwind로 풀스택 단일 앱을 구성한다.
**이유**: API Route 핸들러에서 API 키를 서버에 안전하게 두고 외부 API를 호출할 수 있다. 프론트/백을 한 저장소에서 빠르게 만든다. docs 템플릿·`.claude/settings.json` 훅(npm lint/build/test)과 그대로 호환된다.
**트레이드오프**: 순수 정적 SPA보다 빌드/런타임이 무겁다. 서버리스 배포 환경이 필요하다.

### ADR-002: 분석/추천을 Claude(LLM)로 구현, 구독 자격증명으로 인증
**결정**: 채널 정체성 분석과 차기 컨텐츠 추천을 `@anthropic-ai/claude-agent-sdk`(기본 모델 `claude-sonnet-4-6`)로 생성한다. 인증은 이 기기의 Claude Code 구독 자격증명을 사용하며 별도 `ANTHROPIC_API_KEY`를 쓰지 않는다. viral 점수만 규칙 기반(`lib/viral-score`)으로 계산한다.
**이유**: "무슨 컨텐츠인지 / 다음에 뭘 만들지"는 자연어 통찰이 핵심이라 LLM 품질이 결과를 좌우한다. 구독 인증으로 키 발급·종량제 과금 없이 로컬에서 바로 동작한다(sonnet은 MVP에 충분히 빠름).
**트레이드오프**: Claude Code 자격증명이 있는 환경(로컬)에서만 동작한다 — 외부 배포 시 별도 인증(`CLAUDE_CODE_OAUTH_TOKEN` 등)이 필요하다. 출력 비결정성 → JSON 출력 유도+파싱으로 완화.

### ADR-003: 저장소 없는 stateless 실시간 조회
**결정**: DB/캐시/인증 없이 매 요청마다 YouTube·Claude를 실시간 호출하고 결과만 반환한다.
**이유**: MVP/프로토타입 범위 최소화. 인프라 0으로 즉시 동작.
**트레이드오프**: 동일 채널 재조회 시 매번 쿼터·비용 소모, 히스토리/즐겨찾기 불가. (추후 캐시 도입 여지)
