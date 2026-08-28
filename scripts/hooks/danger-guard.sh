#!/bin/bash
# Danger Guard Hook — PreToolUse[Bash]
# 파괴적 명령어를 차단한다.
#
# 훅 입력은 stdin JSON으로 온다 ($CLAUDE_TOOL_INPUT 같은 환경변수는 존재하지 않는다).
# 차단은 exit 2다 — exit 1은 "비차단 오류"라서 도구가 그대로 실행된다.
# 이 두 가지를 settings.json 인라인으로 두면 이스케이프에 묻혀 조용히 틀린다.

INPUT=$(cat)

# jq가 없으면 tool_input을 파싱할 수 없다. 가드가 조용히 꺼지느니 막고 알린다.
if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED: jq가 없어 Bash 가드를 실행할 수 없습니다. 'brew install jq' 후 다시 시도하세요." >&2
  exit 2
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE 'rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|DROP\s+TABLE'; then
  echo "BLOCKED: 위험한 명령어가 감지되었습니다." >&2
  exit 2
fi

exit 0
