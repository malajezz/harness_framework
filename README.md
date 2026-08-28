# harness_framework

Claude Code로 다단계 구현을 자동 실행하는 하네스. 문서(PRD·ARCHITECTURE·ADR)를 가드레일로 주입하고, step을 순차 실행하며, 실패 시 자가 교정한다.

## 설치

```bash
git clone --depth 1 https://github.com/jha0313/harness_framework /tmp/hf \
  && /tmp/hf/init.sh . \
  && rm -rf /tmp/hf
```

대상 디렉토리를 지정하려면 `init.sh <경로>`.

> 주소는 **`https://github.com/jha0313/harness_framework`** 이다. `.com`이 빠지면 실패한다.

`init.sh`는 복사만 하지 않는다. **설치 후 훅을 실제로 호출해서 동작을 확인한다** — 훅은 조용히 안 걸리는 게 가장 흔한 실패 모드라, "복사됨"과 "동작함"은 다르다. 검증에 실패하면 exit 1로 떨어진다.

기존 파일은 덮어쓰지 않는다. 내용이 다르면 `<파일>.new`로 남기고 경고한다.

### 전제 조건

| | 없으면 |
|---|---|
| `jq` | 훅이 tool_input을 파싱하지 못한다 (`brew install jq`) |
| `python3` | `execute.py`가 안 돈다 |
| `git` | `execute.py`가 브랜치/커밋을 쓴다 |

## 구조

```
.claude/
  settings.json          훅 등록 (PreToolUse: Bash·Edit|Write, Stop)
  commands/harness.md    /harness — step 설계 워크플로우
  commands/review.md     /review
scripts/
  execute.py             step 순차 실행 + 자가 교정
  test_execute.py        execute.py 테스트 (60개)
  hooks/
    tdd-guard.sh         테스트 없는 구현 코드 작성 차단
    danger-guard.sh      파괴적 명령 차단
docs/                    가드레일 — execute.py가 매 step 프롬프트에 주입
CLAUDE.md                프로젝트 규칙 — 함께 주입
```

`phases/`는 여기 없다. `/harness`를 실행해 step을 설계하면 그때 생성된다.

## 사용

1. `CLAUDE.md`와 `docs/`의 `{플레이스홀더}`를 채운다
2. Claude Code에서 `/harness` → step 설계 → `phases/<task>/` 생성
3. `python3 scripts/execute.py <task>` (`--push`로 완료 후 푸시)

에러 복구는 `phases/<task>/index.json`에서 해당 step의 `status`를 `"pending"`으로 되돌리고 재실행한다.

## 알아둘 것

**`docs/` 전체가 매 step 프롬프트에 들어간다.** `execute.py`의 `_load_guardrails()`가 `CLAUDE.md` + `docs/*.md`를 통째로 주입한다. 문서가 길수록 step당 토큰이 비례해서 늘고, 재시도(최대 3회)마다 다시 나간다. **문서를 짧게 유지하는 것이 곧 비용 관리다.**

**`execute.py`는 `git add -A`로 커밋한다.** 워킹트리에 무관한 변경이 있으면 step 커밋에 섞인다. 시작 시 clean tree를 확인하고 더러우면 거부한다.

**`--dangerously-skip-permissions`로 Claude를 호출한다.** 훅이 유일한 방어선이므로, 훅이 조용히 꺼지면 안 된다. `jq`가 없으면 두 훅 모두 통과가 아니라 **차단**(fail-closed)으로 동작한다.

**Anthropic 워크스페이스에 지출 한도를 걸어라.** 재시도 3회 × step 수만큼 호출이 나간다. 애플리케이션 로직 밖이라 어떤 버그도 우회 못 하는 유일한 상한이다.

## 훅 규약

훅 입력은 **stdin JSON**이다. `$CLAUDE_TOOL_INPUT` 같은 환경변수는 **존재하지 않는다** — 주입되는 것은 `CLAUDE_PROJECT_DIR`·`CLAUDE_EFFORT` 등이다. 차단은 **exit 2**다. exit 1은 "비차단 오류"라 도구가 그대로 실행된다.

```bash
COMMAND=$(jq -r '.tool_input.command // empty')   # stdin에서 파싱
[ 조건 ] && { echo "사유" >&2; exit 2; }           # exit 2 = 차단
```

`init.sh`의 검증이 이 두 가지를 실제로 확인한다.
