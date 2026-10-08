#!/usr/bin/env bash
# YidPrint API smoke test. Requires `npm run dev` running with local D1/KV.
set -u
BASE="${1:-http://localhost:5173}"
ADMIN_EMAIL="${ADMIN_EMAIL:-mordybstudios@gmail.com}"
PASS=0; FAIL=0
JAR_ADMIN=$(mktemp); JAR_USER=$(mktemp)

check() { # name expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1";
  else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
ORIGIN="-H Origin:$BASE"
JSON="-H Content-Type:application/json"

echo "== 1. register admin + user =="
check "register admin" 201 "$(code $ORIGIN $JSON -c $JAR_ADMIN -d '{"email":"'$ADMIN_EMAIL'","password":"devpassword123","username":"admin1","display_name":"Admin"}' $BASE/api/auth/register)"
check "register user" 201 "$(code $ORIGIN $JSON -c $JAR_USER -d '{"email":"user@example.com","password":"devpassword123","username":"maker1","display_name":"Maker One"}' $BASE/api/auth/register)"
ROLE=$(curl -s -b $JAR_ADMIN $BASE/api/auth/me | grep -o '"role":"[a-z]*"' | head -1)
check "admin role" '"role":"admin"' "$ROLE"

echo "== 2. create model, upload files, submit =="
MODEL_ID=$(curl -s $ORIGIN $JSON -b $JAR_USER -d '{"title":"Smoke Test Cup","description":"a cup","category_slug":"netilas-yadayim","tags":["cup"],"license":"CC BY","print_settings":{"material":"PLA"}}' $BASE/api/models | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "model created" "1" "$([ -n "$MODEL_ID" ] && echo 1 || echo 0)"
MODEL_SLUG=$(curl -s -b $JAR_USER $BASE/api/models/$MODEL_ID 2>/dev/null | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)
# detail is by slug; fetch own model via admin? owner can GET by slug
MODEL_SLUG=$(curl -s -b $JAR_USER $BASE/api/me/models | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)

printf 'solid cup\nendsolid cup\n' > /tmp/smoke.stl
printf 'PNGFAKEDATA' > /tmp/smoke.png
STL_FILE_ID=$(curl -s $ORIGIN -b $JAR_USER --data-binary @/tmp/smoke.stl -H 'Content-Type:application/octet-stream' "$BASE/api/models/$MODEL_ID/files?kind=model&filename=cup.stl" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
IMG_FILE_ID=$(curl -s $ORIGIN -b $JAR_USER --data-binary @/tmp/smoke.png -H 'Content-Type:image/png' "$BASE/api/models/$MODEL_ID/files?kind=image&filename=pic.png" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "stl uploaded" "1" "$([ -n "$STL_FILE_ID" ] && echo 1 || echo 0)"
check "image uploaded" "1" "$([ -n "$IMG_FILE_ID" ] && echo 1 || echo 0)"
check "submit" 200 "$(code $ORIGIN -b $JAR_USER -X POST $BASE/api/models/$MODEL_ID/submit)"

echo "== 3. pending model hidden from public =="
check "not in listing" "" "$(curl -s "$BASE/api/models" | grep -o "$MODEL_SLUG" | head -1)"
check "detail 404 anon" 404 "$(code $BASE/api/models/$MODEL_SLUG)"
check "file 404 anon" 404 "$(code $BASE/api/files/$STL_FILE_ID)"

echo "== 4. user blocked from admin =="
check "queue 403" 403 "$(code -b $JAR_USER $BASE/api/admin/queue)"

echo "== 5. admin approves =="
check "queue has model" "1" "$(curl -s -b $JAR_ADMIN $BASE/api/admin/queue | grep -c "$MODEL_ID")"
check "approve" 200 "$(code $ORIGIN -b $JAR_ADMIN -X POST $BASE/api/admin/models/$MODEL_ID/approve)"
check "in listing" "1" "$(curl -s "$BASE/api/models" | grep -c "$MODEL_SLUG")"
check "file serves" 200 "$(code $BASE/api/files/$STL_FILE_ID)"

echo "== 6. download increments counter =="
check "download" 200 "$(code -o /dev/null $BASE/api/files/$STL_FILE_ID/download)"
DL=$(curl -s $BASE/api/models/$MODEL_SLUG | grep -o '"downloads_count":[0-9]*' | head -1 | cut -d: -f2)
check "downloads_count >=1" "1" "$([ "${DL:-0}" -ge 1 ] && echo 1 || echo 0)"

echo "== 7. owner edit returns to pending =="
check "patch" 200 "$(code $ORIGIN $JSON -b $JAR_USER -X PATCH -d '{"description":"edited"}' $BASE/api/models/$MODEL_ID)"
STATUS=$(curl -s -b $JAR_USER $BASE/api/models/$MODEL_SLUG | grep -o '"status":"[a-z]*"' | head -1)
check "back to pending" '"status":"pending"' "$STATUS"
check "gone from listing" "" "$(curl -s "$BASE/api/models" | grep -o "$MODEL_SLUG" | head -1)"

echo "== 8. reject requires reason =="
check "reject no reason 400" 400 "$(code $ORIGIN $JSON -b $JAR_ADMIN -X POST -d '{}' $BASE/api/admin/models/$MODEL_ID/reject)"

echo "== 9. origin mismatch =="
check "bad origin 403" 403 "$(code -H Origin:https://evil.example $JSON -b $JAR_USER -X POST -d '{"reason":"x"}' $BASE/api/models/$MODEL_ID/report)"

echo
echo "RESULT: $PASS passed, $FAIL failed"
rm -f $JAR_ADMIN $JAR_USER /tmp/smoke.stl /tmp/smoke.png
[ $FAIL -eq 0 ]
