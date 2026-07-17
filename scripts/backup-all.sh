#!/usr/bin/env bash
# Backup complet One World Morocco : Storage + SQL dump + Code
# Usage :
#   export SUPABASE_TOKEN="..."   # depuis localStorage sb-...-auth-token.access_token
#   ./scripts/backup-all.sh [--full]   # --full inclut business-videos (57 GB)
#
# Prérequis : curl, git, jq (optionnel)

set -euo pipefail

FUNC_URL="https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/export-storage-manifest"
DATE=$(date +%Y-%m-%d)
ROOT="owm-backup-$DATE"
MODE="${1:-light}"

if [[ -z "${SUPABASE_TOKEN:-}" ]]; then
  echo "❌ SUPABASE_TOKEN manquant."
  echo "   Récupère-le sur oneworldmorocco.com (DevTools → Console) :"
  echo "   JSON.parse(localStorage.getItem('sb-plnphgdrawpsnumnejzc-auth-token')).access_token"
  exit 1
fi

mkdir -p "$ROOT"/{storage,code,sql}
cd "$ROOT"

# --- 1. Storage ---
echo "📦 [1/3] Téléchargement du script Storage…"
if [[ "$MODE" == "--full" ]]; then
  QS="format=wget"
  echo "   Mode COMPLET (~57 GB, plusieurs heures)"
else
  QS="format=wget&exclude=business-videos"
  echo "   Mode LÉGER (~9 GB, exclut business-videos)"
fi

curl -fsSL -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "$FUNC_URL?$QS" -o storage/download-storage.sh
chmod +x storage/download-storage.sh
(cd storage && ./download-storage.sh)

# --- 2. Code (git clone frais) ---
echo "💻 [2/3] Clone du repo GitHub…"
git clone --depth 1 https://github.com/wtuce1WM/atlas-connect-solidarity.git code/repo || \
  echo "   ⚠️  Clone échoué — vérifie l'accès Git ou fais-le manuellement."

# --- 3. SQL dump (manuel) ---
cat > sql/README.txt <<EOF
📊 Export SQL — étape manuelle
================================
Lovable Cloud ne fournit pas d'export SQL par API.

1. Va dans Cloud → Advanced settings → Export data
2. Télécharge le .sql.gz
3. Place-le dans ce dossier : owm-backup-$DATE/sql/
EOF
echo "📊 [3/3] Voir sql/README.txt pour l'export SQL manuel."

echo ""
echo "✅ Backup structurel prêt dans : $(pwd)"
du -sh storage code 2>/dev/null || true
echo ""
echo "👉 N'oublie pas de :"
echo "   1. Télécharger le dump SQL depuis Lovable Cloud"
echo "   2. Copier '$ROOT' sur un disque externe ou cloud perso"
