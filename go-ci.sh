#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}" # unit | integration | all

# ---------- helpers ----------
step() { echo; echo "==> $1"; echo "    $2"; }
ok()   { echo "    ✅ $1"; }

die() {
  echo
  echo "❌ FAIL at: $1"
  echo "    What it checks: $2"
  [[ -n "${3:-}" ]] && { echo "    Details:"; echo "$3"; }
  [[ -n "${4:-}" ]] && { echo; echo "👉 Fix (run these):"; echo "$4"; }
  exit 1
}

run() {
  # run "<cmd>" "<step-name>" "<what>" "<fix-cmds>"
  local cmd="$1" name="$2" what="$3" fix="${4:-}"
  local out; out="$(mktemp)"
  bash -lc "$cmd" >"$out" 2>&1 || die "$name" "$what" "$(cat "$out")" "$fix"
  rm -f "$out"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1" "Tool required" "" "Install '$1' then retry"
}

need_env() {
  local var="$1" example="${2:-}"
  [[ -n "${!var:-}" ]] || die "integration tests" "Environment check" "" \
"export $var='$example'
# then rerun:
./go-ci.sh integration"
}

# ---------- preflight ----------
need_cmd go

# ---------- steps ----------
step "gofmt (style)" "Checks Go formatting (spacing/imports/indentation)."
files="$(gofmt -l . || true)"
if [[ -n "$files" ]]; then
  die "gofmt" "Code style / formatting" \
"These files are not formatted:
$files" \
"gofmt -w .
# then rerun:
./go-ci.sh $MODE"
fi
ok "formatting OK"

step "go vet (static analysis)" "Catches common bugs (printf mismatch, suspicious constructs)."
run "go vet ./..." "go vet" "Static analysis" \
"go vet ./...
# Fix reported issues, then rerun:
./go-ci.sh $MODE"
ok "go vet OK"

step "go mod download" "Downloads/verifies module dependencies."
run "go mod download" "go mod download" "Dependency resolution" \
"go mod download
# If checksum issues:
go clean -modcache && go mod download
# then rerun:
./go-ci.sh $MODE"
ok "deps downloaded"

step "go build" "Compiles packages to ensure the project builds."
run "go build -v ./..." "go build" "Compilation" \
"go build ./...
# Fix compile errors above, then rerun:
./go-ci.sh $MODE"
ok "build OK"

step "go test (unit)" "Runs unit tests (*_test.go)."
run "go test -v ./... -count=1" "unit tests" "Unit tests" \
"go test -v ./... -count=1
# Fix failing tests, then rerun:
./go-ci.sh $MODE"
ok "unit tests OK"

# ---------- integration via docker compose ----------
if [[ "$MODE" == "integration" || "$MODE" == "all" ]]; then
  need_cmd docker

  step "docker compose up" "Starts required services for integration tests."
  # ไม่ auto แก้ แต่ "จะรัน up" เพื่อให้เทสมี service จริง
  run "docker compose up -d" "docker compose up" "Start services" \
"docker compose ps
docker compose logs --tail=200
# If needed restart clean:
docker compose down -v
docker compose up -d"
  ok "services started"

  # ถ้าโปรเจกต์มี healthcheck อยู่แล้ว จะช่วยมาก
  step "docker compose status" "Shows service status (useful when tests fail)."
  run "docker compose ps" "docker compose ps" "Service status" \
"docker compose ps
docker compose logs --tail=200"
  ok "compose status OK"

  # ตั้งค่า env ให้เทสไปเจอ service
  # (ปรับ example ให้ตรง service ของเธอได้)
  need_env DATABASE_URL "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
  need_env RABBITMQ_URL "amqp://guest:guest@localhost:5672/"

  step "go test -tags=integration" "Runs integration tests against REAL DB/RabbitMQ."
  run "go test -v -tags=integration ./... -count=1" \
      "integration tests" "DB / RabbitMQ integration" \
"docker compose ps
docker compose logs --tail=200
# Rerun only integration:
./go-ci.sh integration"
  ok "integration tests OK"

  step "docker compose down" "Stops services after tests (cleanup)."
  # cleanup ถ้า down fail ก็ให้บอก command ไม่ต้องล้มทั้ง pipeline
  if ! docker compose down >/dev/null 2>&1; then
    echo "    ⚠️  cleanup failed; run manually:"
    echo "       docker compose down -v"
  else
    ok "services stopped"
  fi
fi

echo
echo "✅ ALL PASSED (mode: $MODE)"
