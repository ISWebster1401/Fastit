#!/usr/bin/env bash
# Este proyecto vive dentro de iCloud Drive. Cuando iCloud detecta que un proceso
# (npm install, git, el propio iCloud en otro dispositivo) toca node_modules/.venv
# mientras sincroniza, renombra el symlink a "node_modules 2", "node_modules 3",
# ".venv 2", etc. y el original queda roto o desaparece. Además, `npm install`
# a veces recrea node_modules como carpeta real cuando encuentra el symlink roto.
# Este script repara los symlinks esperados en cada arranque / postinstall.
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fix_link() {
  local dir="$1" link_name="$2" real_name="$3"
  [ -d "$dir" ] || return 0

  # Ya es el symlink correcto → nada que hacer.
  if [ -L "$dir/$link_name" ] && [ "$(readlink "$dir/$link_name")" = "$real_name" ]; then
    return 0
  fi

  # npm/pip recrearon $link_name como carpeta real (pasa cuando lo pillan roto
  # a mitad de una instalación) → esa carpeta real es la fuente de verdad más
  # reciente, reemplaza a la vieja copia .nosync.
  if [ -d "$dir/$link_name" ] && [ ! -L "$dir/$link_name" ]; then
    rm -rf "$dir/$real_name"
    mv "$dir/$link_name" "$dir/$real_name"
  fi

  [ -d "$dir/$real_name" ] || return 0

  rm -f "$dir/$link_name 2" "$dir/$link_name 3"
  rm -f "$dir/$link_name"
  ln -s "$real_name" "$dir/$link_name"
  echo "[fix-symlinks] reparado: $dir/$link_name -> $real_name"
}

fix_link "$ROOT_DIR/front" "node_modules" "node_modules.nosync"
fix_link "$ROOT_DIR/back"  ".venv"        ".venv.nosync"

exit 0
