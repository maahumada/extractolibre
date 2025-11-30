#!/usr/bin/env bash

# Backup local MongoDB database using mongodump.
# Requires MONGODB_URI in the environment and MongoDB Database Tools installed.

set -euo pipefail

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump no está instalado. Instalá MongoDB Database Tools." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Intenta cargar .env.local o .env si MONGODB_URI no está exportada
if [[ -z "${MONGODB_URI:-}" ]]; then
  if [[ -f "${ROOT_DIR}/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env.local"
    set +a
  elif [[ -f "${ROOT_DIR}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
  fi
fi

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "Falta MONGODB_URI. Definila en .env.local/.env o exportala antes de correr el script." >&2
  exit 1
fi

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
DEST_DIR="${ROOT_DIR}/backups/mongo-${TIMESTAMP}"

mkdir -p "${DEST_DIR}"

mongodump --uri="${MONGODB_URI}" --out="${DEST_DIR}"

echo "Backup creado en ${DEST_DIR}"
