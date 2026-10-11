#!/usr/bin/env bash
# Clona los repos de referencia (MIT / Apache-2.0) en vendor/, fijados a un commit exacto.
# vendor/ está en .gitignore: estos repos no forman parte de este repositorio.
# Se excluye su carpeta .claude/ para que Claude Code no cargue skills duplicadas.
# Si se pasan rutas tras el commit, solo se traen esos archivos (clon parcial: sin el resto de blobs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="${VENDOR_DIR:-$ROOT/vendor}"

fetch() {
  local name="$1" url="$2" sha="$3"
  shift 3
  local paths=("$@")
  local dir="$VENDOR/$name"

  if [[ -e "$dir" && ! -d "$dir/.git" ]]; then
    echo "error: $dir existe y no es un repo git; muévelo o bórralo y vuelve a intentarlo" >&2
    exit 1
  fi

  if [[ ! -d "$dir/.git" ]]; then
    mkdir -p "$dir"
    git -C "$dir" init --quiet
    git -C "$dir" remote add origin "$url"
    if [[ ${#paths[@]} -gt 0 ]]; then
      git -C "$dir" sparse-checkout set --no-cone "${paths[@]}"
    else
      git -C "$dir" sparse-checkout set --no-cone '/*' '!/.claude/'
    fi
  fi

  if [[ "$(git -C "$dir" rev-parse --verify --quiet HEAD || true)" == "$sha" ]]; then
    echo "ok  $name @ ${sha:0:7} (ya estaba)"
    return
  fi

  if ! git -C "$dir" cat-file -e "$sha^{commit}" 2>/dev/null; then
    local filter=()
    [[ ${#paths[@]} -gt 0 ]] && filter=(--filter=blob:none)
    git -C "$dir" fetch --quiet --depth 1 ${filter[@]+"${filter[@]}"} origin "$sha"
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

# Temas para `@dialmade/catalog` (themePresets). Solo los archivos de datos.
fetch daisyui \
  https://github.com/saadeghi/daisyui.git \
  8c24218588f34a678f48df435950790b57ef2bf7 \
  '/LICENSE' '/packages/daisyui/package.json' '/packages/daisyui/src/themes/*.css'

fetch tweakcn \
  https://github.com/jnsahaj/tweakcn.git \
  a3b47b37cba97dd637de517aab52c45ec0f83456 \
  '/LICENSE' '/package.json' '/utils/theme-presets.ts'
