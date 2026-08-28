#!/usr/bin/env bash
# harness_framework — 프로젝트 부트스트랩
#
# 사용법:
#   ./init.sh [대상디렉토리]      # 기본값: 현재 디렉토리
#
# 하는 일:
#   1. 전제 조건 확인 (git · jq · python3)
#   2. 프레임워크 파일 복사 (기존 파일은 덮어쓰지 않고 .new 로 남긴다)
#   3. 훅 실행권한 부여
#   4. **설치 검증** — 훅이 진짜 동작하는지 실제로 호출해서 확인한다
#
# 검증이 이 스크립트의 핵심이다. 훅은 조용히 안 걸리는 게 가장 흔한 실패라
# "복사됨"과 "동작함"은 다르다.

set -uo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-$PWD}"
FAIL=0

say()  { printf '%s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

say ""
say "harness_framework → $TARGET"
say "============================================================"

# --- 1. 전제 조건 -----------------------------------------------------------
say ""
say "[1/4] 전제 조건"

command -v git >/dev/null     && ok "git"     || bad "git 없음"
command -v python3 >/dev/null && ok "python3 ($(python3 --version 2>&1 | cut -d' ' -f2))" || bad "python3 없음 — execute.py가 안 돈다"
if command -v jq >/dev/null; then
  ok "jq ($(jq --version))"
else
  bad "jq 없음 — 훅이 tool_input을 파싱하지 못한다. 'brew install jq'"
fi

mkdir -p "$TARGET" 2>/dev/null
if git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then
  ok "git 저장소"
else
  warn "git 저장소가 아니다 — execute.py는 브랜치/커밋을 쓰므로 'git init'이 필요하다"
fi

[ "$FAIL" -gt 0 ] && { say ""; say "전제 조건 미충족 — 위를 해결하고 다시 실행하라."; exit 1; }

# --- 2. 파일 복사 -----------------------------------------------------------
say ""
say "[2/4] 파일 복사"

copy() { # copy <상대경로>
  local rel="$1" src="$SRC/$1" dst="$TARGET/$1"
  [ -f "$src" ] || return 0
  mkdir -p "$(dirname "$dst")"
  if [ -f "$dst" ]; then
    if cmp -s "$src" "$dst"; then
      ok "$rel (동일 — 건너뜀)"
    else
      cp "$src" "$dst.new"
      warn "$rel 이미 존재 — $rel.new 로 저장했다. diff 후 직접 병합하라"
    fi
  else
    cp "$src" "$dst"
    ok "$rel"
  fi
}

while IFS= read -r rel; do copy "$rel"; done <<EOF
CLAUDE.md
.gitignore
.claude/settings.json
.claude/commands/harness.md
.claude/commands/review.md
scripts/execute.py
scripts/test_execute.py
scripts/hooks/tdd-guard.sh
scripts/hooks/danger-guard.sh
docs/PRD.md
docs/ARCHITECTURE.md
docs/ADR.md
docs/UI_GUIDE.md
EOF

chmod +x "$TARGET"/scripts/hooks/*.sh 2>/dev/null && ok "훅 실행권한"

# --- 3. 설치 검증 -----------------------------------------------------------
# "복사됨"이 아니라 "동작함"을 확인한다. 훅은 조용히 안 걸리는 게 기본 실패 모드다.
say ""
say "[3/4] 설치 검증 (실제로 훅을 호출한다)"

SETTINGS="$TARGET/.claude/settings.json"
if jq empty "$SETTINGS" 2>/dev/null; then
  ok "settings.json 유효한 JSON"
else
  bad "settings.json 파싱 실패"
fi

# 훅이 stdin JSON을 읽는지 — $CLAUDE_TOOL_INPUT 같은 환경변수는 존재하지 않는다
if grep -q 'CLAUDE_TOOL_INPUT' "$SETTINGS" 2>/dev/null; then
  bad "settings.json이 \$CLAUDE_TOOL_INPUT을 참조한다 — 존재하지 않는 변수라 가드가 무력화된다"
else
  ok "훅 입력 규약 (stdin JSON)"
fi

DG="$TARGET/scripts/hooks/danger-guard.sh"
if [ -f "$DG" ]; then
  # 위험 문자열을 조립한다 — 이 스크립트 자체가 가드에 걸리지 않도록
  R="rm"; F="-rf"
  printf '{"tool_name":"Bash","tool_input":{"command":"%s %s /"}}' "$R" "$F" | bash "$DG" >/dev/null 2>&1
  [ $? -eq 2 ] && ok "danger-guard: 위험 명령 차단 (exit 2)" || bad "danger-guard: 위험 명령을 통과시킨다"

  printf '{"tool_name":"Bash","tool_input":{"command":"npm run test"}}' | bash "$DG" >/dev/null 2>&1
  [ $? -eq 0 ] && ok "danger-guard: 정상 명령 통과" || bad "danger-guard: 정상 명령을 오차단한다"
else
  bad "danger-guard.sh 없음"
fi

TG="$TARGET/scripts/hooks/tdd-guard.sh"
if [ -f "$TG" ]; then
  if [ -f "$TARGET/package.json" ]; then
    OUT=$(printf '{"tool_input":{"file_path":"%s/lib/__probe__.ts"}}' "$TARGET" | bash "$TG" 2>/dev/null)
    echo "$OUT" | grep -q '"deny"' \
      && ok "tdd-guard: 테스트 없는 구현 파일 차단" \
      || bad "tdd-guard: 테스트 없이 통과시킨다"
  else
    ok "tdd-guard: 설치됨 (package.json 생기면 활성화 — 스캐폴드 전에는 강제 대상이 없다)"
  fi
else
  bad "tdd-guard.sh 없음"
fi

if [ -f "$TARGET/.gitignore" ] && grep -qE '^\.env' "$TARGET/.gitignore"; then
  ok ".gitignore가 .env 차단 (API 키 커밋 방지)"
else
  bad ".gitignore에 .env 항목이 없다 — API 키가 커밋된다"
fi

if [ -f "$TARGET/scripts/execute.py" ]; then
  python3 -c "import ast,sys; ast.parse(open('$TARGET/scripts/execute.py').read())" 2>/dev/null \
    && ok "execute.py 구문" || bad "execute.py 구문 오류"
fi

# --- 4. 다음 단계 -----------------------------------------------------------
say ""
say "[4/4] 결과"
say "============================================================"
if [ "$FAIL" -gt 0 ]; then
  say "  검증 실패 ${FAIL}건 — 위 ✗ 항목을 해결하라."
  exit 1
fi

cat <<'NEXT'
  설치 완료 — 훅이 실제로 동작하는 것까지 확인했다.

  다음:
    1. CLAUDE.md 의 {플레이스홀더}를 채운다 (프로젝트명·스택·CRITICAL 규칙)
    2. docs/PRD.md · ARCHITECTURE.md · ADR.md 를 채운다
       → execute.py 가 이 문서 전체를 매 step 프롬프트에 주입한다.
         길어질수록 step 당 토큰이 그대로 늘어난다. 짧게 유지하라.
    3. Claude Code 에서 /harness 실행 → step 설계 → phases/ 생성
    4. python3 scripts/execute.py <task-name>

  주의: execute.py 는 'git add -A' 로 커밋한다. 워킹트리를 깨끗이 두고 시작하라.
NEXT
