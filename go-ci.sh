#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}" # help | secret | sca | sast | security | format | vet | deps | build | test | all | full

# ---------- color codes ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ---------- status tracking (bash 3.2 compatible) ----------
declare -a test_order
declare -a test_passed
declare -a test_failed

# ensure arrays are "set" even when empty (safe with set -u)
test_order=()
test_passed=()
test_failed=()

add_test() { test_order+=("$1"); }

mark_passed() {
  test_passed+=("$1")
  echo -e "${GREEN}    ✅ PASSED${NC}"
}

mark_failed() {
  test_failed+=("$1")
  echo -e "${RED}    ❌ FAILED${NC}"
}

test_status() {
  local name="$1" i

  for i in ${test_passed[@]+"${test_passed[@]}"}; do
    [[ "$i" == "$name" ]] && echo "passed" && return 0
  done

  for i in ${test_failed[@]+"${test_failed[@]}"}; do
    [[ "$i" == "$name" ]] && echo "failed" && return 0
  done

  echo "pending"
}

print_summary() {
  echo
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}  TEST SUMMARY${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}"

  local t status
  for t in "${test_order[@]}"; do
    status="$(test_status "$t")"
    case "$status" in
      passed)  echo -e "${GREEN}✅ PASSED${NC}  | $t" ;;
      failed)  echo -e "${RED}❌ FAILED${NC}  | $t" ;;
      pending) echo -e "${YELLOW}⏭️  SKIPPED${NC} | $t" ;;
    esac
  done

  local passed_count=${#test_passed[@]}
  local failed_count=${#test_failed[@]}
  local total=${#test_order[@]}

  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "Total: $total | ${GREEN}Passed: $passed_count${NC} | ${RED}Failed: $failed_count${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo
}

# ---------- helpers ----------
step() {
  echo
  echo -e "${BLUE}==> $1${NC}"
  echo "    $2"
}

# ---------- CI-friendly reporting ----------
extract_locations() {
  # extract file:line(:col) from output, keep file list unique
  grep -Eo '([A-Za-z0-9_./-]+\.(go|mod|sum)):[0-9]+(:[0-9]+)?' | \
    sort -u | head -n 8
}

headline_from_output() {
  awk 'NF{print; exit}' | head -n 1
}

print_ci_summary_block() {
  # print_ci_summary_block "<step>" "<status>" "<cause>" "<where>" "<what_to_do>"
  local step_name="$1" status="$2" cause="$3" where="$4" todo="$5"

  echo
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}  CI SUMMARY — $step_name${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "Status : $status"
  [[ -n "$cause" ]] && echo -e "Cause  : $cause"

  if [[ -n "$where" ]]; then
    echo -e "Where  :"
    while IFS= read -r line; do
      [[ -n "$line" ]] && echo "  - $line"
    done <<< "$where"
  fi

  if [[ -n "$todo" ]]; then
    echo -e "Next   :"
    while IFS= read -r line; do
      [[ -n "$line" ]] && echo "  $line"
    done <<< "$todo"
  fi

  echo -e "${BLUE}════════════════════════════════════════${NC}"
}

print_pass_block() {
  # print_pass_block "<step>" "<note>"
  local step_name="$1" note="${2:-OK}"
  print_ci_summary_block "$step_name" "✅ PASS" "$note" "" ""
}

summarize_gitleaks() {
  local out="$1"
  local cause where
  cause="$(printf "%s" "$out" | grep -E 'Leak|Found|detected|hits|entropy|rule' -m 1 || true)"
  where="$(printf "%s" "$out" | extract_locations || true)"
  [[ -z "$cause" ]] && cause="$(printf "%s" "$out" | headline_from_output)"
  print_ci_summary_block "gitleaks (secret scan)" "❌ FAIL" \
"${cause:-Secrets detected}" "$where" \
$'1) Remove secrets from repo/history if needed\n2) Rotate keys/tokens immediately\n3) Rerun: ./go-ci.sh secret'
}

summarize_govulncheck() {
  local out="$1"
  local found_in fixed_in where cause
  found_in="$(printf "%s" "$out" | grep -E 'Found in:' -m 1 | sed 's/^[[:space:]]*//')"
  fixed_in="$(printf "%s" "$out" | grep -E 'Fixed in:' -m 1 | sed 's/^[[:space:]]*//')"
  where="$(printf "%s" "$out" | extract_locations || true)"

  cause="Vulnerable Go stdlib/deps reachable by your code"
  [[ -n "$found_in" ]] && cause="$cause • $found_in"
  [[ -n "$fixed_in" ]] && cause="$cause • $fixed_in"

  print_ci_summary_block "govulncheck (SCA)" "❌ FAIL" \
"$cause" "$where" \
$'1) If stdlib: upgrade Go/toolchain to a fixed version (example: >= go1.24.13)\n2) Rerun: govulncheck ./...\n3) Then: ./go-ci.sh sca'
}

summarize_gosec() {
  local out="$1"
  local cause where
  cause="$(printf "%s" "$out" | grep -E 'G[0-9]{3}|Issues|Confidence|Severity' -m 1 || true)"
  where="$(printf "%s" "$out" | extract_locations || true)"
  [[ -z "$cause" ]] && cause="$(printf "%s" "$out" | headline_from_output)"
  print_ci_summary_block "gosec (SAST)" "❌ FAIL" \
"${cause:-Security issues found by gosec}" "$where" \
$'1) Fix findings or add justified suppressions\n2) Rerun: gosec ./...\n3) Then: ./go-ci.sh sast'
}

summarize_gofmt() {
  local files="$1"
  print_ci_summary_block "gofmt (style)" "❌ FAIL" \
"Files are not formatted" "$files" \
$'1) Run: gofmt -w .\n2) Commit formatting changes\n3) Then: ./go-ci.sh format'
}

summarize_govet() {
  local out="$1"
  local cause where
  cause="$(printf "%s" "$out" | headline_from_output)"
  where="$(printf "%s" "$out" | extract_locations || true)"
  print_ci_summary_block "go vet (static analysis)" "❌ FAIL" \
"${cause:-go vet reported issues}" "$where" \
$'1) Fix vet warnings/errors\n2) Rerun: go vet ./...\n3) Then: ./go-ci.sh vet'
}

summarize_gomod() {
  local out="$1"
  local cause
  cause="$(printf "%s" "$out" | grep -E 'checksum|sum|mod|proxy|TLS|timeout|denied|404|authentication|unrecognized import path' -m 1 || true)"
  [[ -z "$cause" ]] && cause="$(printf "%s" "$out" | headline_from_output)"
  print_ci_summary_block "go mod download" "❌ FAIL" \
"${cause:-Dependency download/verify failed}" "" \
$'1) Try: go clean -modcache && go mod download\n2) Check GOPROXY / network / auth\n3) Then: ./go-ci.sh deps'
}

summarize_gobuild() {
  local out="$1"
  local cause where
  cause="$(printf "%s" "$out" | grep -E 'undefined:|cannot find|type .* has no|missing|build failed|error:' -m 1 || true)"
  [[ -z "$cause" ]] && cause="$(printf "%s" "$out" | headline_from_output)"
  where="$(printf "%s" "$out" | extract_locations || true)"
  print_ci_summary_block "go build" "❌ FAIL" \
"${cause:-Compilation failed}" "$where" \
$'1) Fix compile errors above\n2) Rerun: go build -v ./...\n3) Then: ./go-ci.sh build'
}

summarize_gotest() {
  local out="$1"
  local cause where
  cause="$(printf "%s" "$out" | grep -E '^--- FAIL:|panic:|FAIL|race' -m 1 || true)"
  [[ -z "$cause" ]] && cause="$(printf "%s" "$out" | headline_from_output)"
  where="$(printf "%s" "$out" | extract_locations || true)"
  print_ci_summary_block "go test (unit)" "❌ FAIL" \
"${cause:-Unit tests failed}" "$where" \
$'1) Inspect failing tests\n2) Rerun: go test -v ./... -count=1\n3) Then: ./go-ci.sh test'
}

die() {
  echo
  echo -e "${RED}❌ FAIL at: $1${NC}"
  echo "    What it checks: $2"
  [[ -n "${3:-}" ]] && { echo "    Details:"; echo "$3"; }
  [[ -n "${4:-}" ]] && { echo; echo "    👉 Fix (run these):"; echo "$4"; }

  # ---- CI-friendly summary (per step) ----
  case "$1" in
    "gitleaks (secret scan)") summarize_gitleaks "${3:-}" ;;
    "govulncheck (SCA)")      summarize_govulncheck "${3:-}" ;;
    "gosec (SAST)")           summarize_gosec "${3:-}" ;;
    "gofmt (style)")          summarize_gofmt "${3:-}" ;;
    "go vet (static analysis)") summarize_govet "${3:-}" ;;
    "go mod download")        summarize_gomod "${3:-}" ;;
    "go build")               summarize_gobuild "${3:-}" ;;
    "go test (unit)")         summarize_gotest "${3:-}" ;;
    *) print_ci_summary_block "$1" "❌ FAIL" "See logs above" "" "" ;;
  esac

  mark_failed "$1"
  print_summary || true
  exit 1
}

run() {
  # run "<cmd>" "<step-name>" "<what>" "<fix>"
  local cmd="$1" name="$2" what="$3" fix="${4:-}"
  local out; out="$(mktemp)"
  bash -lc "$cmd" >"$out" 2>&1 || die "$name" "$what" "$(cat "$out")" "$fix"
  rm -f "$out"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1" "Tool required" "" "Install '$1' then retry"
}

ensure_go_tool() {
  # ensure_go_tool <binary> <module@version>
  local bin="$1" mod="$2"
  local gopath gobin

  gopath="$(go env GOPATH 2>/dev/null || true)"
  [[ -z "$gopath" ]] && die "$bin" "Tool installation" "GOPATH is empty" "Fix Go install/env then retry"

  gobin="${GOBIN:-$gopath/bin}"
  mkdir -p "$gobin"

  # already in PATH?
  if command -v "$bin" >/dev/null 2>&1; then
    return 0
  fi

  # exists in GOBIN but PATH not updated?
  if [[ -x "$gobin/$bin" ]]; then
    export PATH="$gobin:$PATH"
    return 0
  fi

  step "Install $bin" "Missing '$bin' — installing via: go install $mod"
  run "go install $mod" "Install $bin" "Tool installation" \
"go install $mod
# then rerun:
./go-ci.sh $MODE"

  export PATH="$gobin:$PATH"

  command -v "$bin" >/dev/null 2>&1 || die "$bin" "Tool installation" \
"Installed but still not found in PATH (expected in $gobin)" \
"Add to PATH:
export PATH=\"$gobin:\$PATH\""
}

usage() {
  cat <<'EOF'
Usage:
  ./go-ci.sh [mode]

Modes:
  help        Show this help

  secret      Secret scan (gitleaks)
  sca         Dependency vuln scan (govulncheck)
  sast        SAST scan (gosec)
  security    runs: secret -> sca -> sast

  format      gofmt check (fails if changes needed)
  vet         go vet ./...
  deps        go mod download
  build       go build ./...
  test        go test ./...
  all         runs: format -> vet -> deps -> build -> test

  full        runs: security -> all  (matches queue CI coverage)

Examples:
  chmod +x go-ci.sh
  ./go-ci.sh security
  ./go-ci.sh all
  ./go-ci.sh full
EOF
}

if [[ "$MODE" == "help" || "$MODE" == "-h" || "$MODE" == "--help" ]]; then
  usage
  exit 0
fi

# ---------- preflight ----------
need_cmd go

# ---------- register tests (for summary) ----------
add_test "gitleaks (secret scan)"
add_test "govulncheck (SCA)"
add_test "gosec (SAST)"
add_test "gofmt (style)"
add_test "go vet (static analysis)"
add_test "go mod download"
add_test "go build"
add_test "go test (unit)"

# ---------- security steps ----------
run_secret() {
  step "gitleaks (secret scan)" "Detects leaked secrets (tokens/keys/passwords) in the working tree."
  ensure_go_tool "gitleaks" "github.com/gitleaks/gitleaks/v8@latest"
  run "gitleaks detect --redact --no-git" "gitleaks (secret scan)" "Secret scanning" \
"gitleaks detect --redact --no-git
# Remove secrets, rotate keys, then rerun:
./go-ci.sh secret"
  mark_passed "gitleaks (secret scan)"
  print_pass_block "gitleaks (secret scan)" "No leaked tokens/keys/passwords detected"
}

run_sca() {
  step "govulncheck (SCA)" "Checks known vulnerabilities in Go stdlib + module dependencies."
  ensure_go_tool "govulncheck" "golang.org/x/vuln/cmd/govulncheck@latest"
  run "govulncheck ./..." "govulncheck (SCA)" "Dependency vulnerability scanning" \
"govulncheck ./...
# If it's stdlib issues: upgrade Go (go.mod/toolchain) then rerun:
./go-ci.sh sca"
  mark_passed "govulncheck (SCA)"
  print_pass_block "govulncheck (SCA)" "No reachable vulnerabilities found in stdlib/deps"
}

run_sast() {
  step "gosec (SAST)" "Analyzes Go code for common security issues (crypto, file perms, injections)."
  ensure_go_tool "gosec" "github.com/securego/gosec/v2/cmd/gosec@latest"
  run "gosec ./..." "gosec (SAST)" "Static application security testing" \
"gosec ./...
# Fix findings or tune rules, then rerun:
./go-ci.sh sast"
  mark_passed "gosec (SAST)"
  print_pass_block "gosec (SAST)" "No high-confidence security issues found"
}

run_security() {
  run_secret
  run_sca
  run_sast
}

# ---------- quality/build/test steps ----------
run_format() {
  step "gofmt (style)" "Checks Go formatting (spacing/imports/indentation)."
  local files
  files="$(gofmt -l . || true)"
  if [[ -n "$files" ]]; then
    summarize_gofmt "$files"
    die "gofmt (style)" "Code style / formatting" "$files" \
"gofmt -w .
# then rerun:
./go-ci.sh format"
  fi
  mark_passed "gofmt (style)"
  print_pass_block "gofmt (style)" "Formatting OK (no files need gofmt)"
}

run_vet() {
  step "go vet (static analysis)" "Catches common bugs (printf mismatch, suspicious constructs)."
  run "go vet ./..." "go vet (static analysis)" "Static analysis" \
"go vet ./...
# Fix reported issues, then rerun:
./go-ci.sh vet"
  mark_passed "go vet (static analysis)"
  print_pass_block "go vet (static analysis)" "No vet issues detected"
}

run_deps() {
  step "go mod download" "Downloads/verifies module dependencies."
  run "go mod download" "go mod download" "Dependency resolution" \
"go mod download
# If checksum/cache issues:
go clean -modcache && go mod download
# then rerun:
./go-ci.sh deps"
  mark_passed "go mod download"
  print_pass_block "go mod download" "Dependencies downloaded/verified"
}

run_build() {
  step "go build" "Compiles packages to ensure the project builds."
  run "go build -v ./..." "go build" "Compilation" \
"go build -v ./...
# Fix compile errors above, then rerun:
./go-ci.sh build"
  mark_passed "go build"
  print_pass_block "go build" "Compilation OK"
}

run_test() {
  step "go test (unit)" "Runs unit tests (*_test.go)."
  run "go test -v ./... -count=1" "go test (unit)" "Unit tests" \
"go test -v ./... -count=1
# Fix failing tests, then rerun:
./go-ci.sh test"
  mark_passed "go test (unit)"
  print_pass_block "go test (unit)" "All unit tests passed"
}

# ---------- run selected mode ----------
case "$MODE" in
  secret)   run_secret ;;
  sca)      run_sca ;;
  sast)     run_sast ;;
  security) run_security ;;
  format)   run_format ;;
  vet)      run_vet ;;
  deps)     run_deps ;;
  build)    run_build ;;
  test)     run_test ;;
  all)
    run_format
    run_vet
    run_deps
    run_build
    run_test
    ;;
  full)
    run_security
    run_format
    run_vet
    run_deps
    run_build
    run_test
    ;;
  *)
    echo "Unknown mode: $MODE"
    usage
    exit 2
    ;;
esac

print_summary
