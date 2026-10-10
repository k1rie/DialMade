#!/usr/bin/env bash
# Clona los repos de referencia (MIT) en vendor/, fijados a un commit exacto.
# vendor/ está en .gitignore: estos repos no forman parte de este repositorio.
# Se excluye su carpeta .claude/ para que Claude Code no cargue skills duplicadas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="${VENDOR_DIR:-$ROOT/vendor}"

fetch() {
  local name="$1" url="$2" sha="$3"
  local dir="$VENDOR/$name"

  if [[ -e "$dir" && ! -d "$dir/.git" ]]; then
    echo "error: $dir existe y no es un repo git; muévelo o bórralo y vuelve a intentarlo" >&2
    exit 1
  fi

  if [[ ! -d "$dir/.git" ]]; then
    mkdir -p "$dir"
    git -C "$dir" init --quiet
    git -C "$dir" remote add origin "$url"
    git -C "$dir" sparse-checkout set --no-cone '/*' '!/.claude/'
  fi

  if [[ "$(git -C "$dir" rev-parse --verify --quiet HEAD || true)" == "$sha" ]]; then
    echo "ok  $name @ ${sha:0:7} (ya estaba)"
    return
  fi

  if ! git -C "$dir" cat-file -e "$sha^{commit}" 2>/dev/null; then
    git -C "$dir" fetch --quiet --depth 1 origin "$sha"
  fi
  git -C "$dir" -c advice.detachedHead=false checkout --quiet "$sha"
  echo "ok  $name @ ${sha:0:7}"
}

fetch ui-ux-pro-max-skill \
  https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git \
  50d8a7de0900119855614541f15a1a616691eb33

fetch i-have-adhd \
  https://github.com/ayghri/i-have-adhd.git \
  723af7d9afaf43eb871dbcce6129e2bf80de90d5
