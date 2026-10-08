#!/usr/bin/env bash
# Creates the admin user in local D1 (admins can't self-register — reserved emails 403).
# Usage: scripts/seed-admin.sh [email] [password] [username] [display_name]
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || . ~/.nvm/nvm.sh
EMAIL="${1:-${ADMIN_EMAIL:-mordybstudios@gmail.com}}"
PASSWORD="${2:-devpassword123}"
USERNAME="${3:-mordyb}"
DISPLAY="${4:-Mordy B}"
HASH=$(node scripts/hash-password.mjs "$PASSWORD")
ID=$(cat /proc/sys/kernel/random/uuid)
NOW=$(date +%s%3N)
SQL="INSERT OR IGNORE INTO users (id, email, username, display_name, password_hash, role, created_at) VALUES ('$ID', '$EMAIL', '$USERNAME', '$DISPLAY', '$HASH', 'admin', $NOW); UPDATE users SET role='admin' WHERE email='$EMAIL';"
npx wrangler d1 execute yidprint --local --command "$SQL" >/dev/null
echo "admin ready: $EMAIL / $PASSWORD ($USERNAME)"
