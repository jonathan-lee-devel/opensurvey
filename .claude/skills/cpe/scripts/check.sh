#!/usr/bin/env bash
# Runs every check CI runs (.github/workflows/ci.yml), locally, fail-fast.
# Exit 0 only if everything passes. Prints a one-line summary per step.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

step() {
  local name="$1"; shift
  echo
  echo "▶ $name"
  if "$@"; then
    echo "✔ $name"
  else
    echo "✘ $name FAILED" >&2
    exit 1
  fi
}

# The api e2e tests start a Postgres container via Testcontainers.
if ! docker info >/dev/null 2>&1; then
  echo "✘ Docker is not running; api e2e tests need it (Testcontainers)." >&2
  exit 1
fi

# --- api (NestJS) ---
step "api: install"   bash -c 'cd api && yarn install --frozen-lockfile --silent'
step "api: lint"      bash -c 'cd api && yarn lint'
step "api: unit"      bash -c 'cd api && yarn test'
step "api: e2e"       bash -c 'cd api && yarn test:e2e'
step "api: build"     bash -c 'cd api && yarn build'

# --- web (Angular) --- CI=true makes `ng test` run once instead of watching.
step "web: install"   bash -c 'cd web && yarn install --frozen-lockfile --silent'
step "web: unit"      bash -c 'cd web && CI=true yarn test'
step "web: build"     bash -c 'cd web && CI=true yarn build'

echo
echo "ALL CHECKS PASSED"
