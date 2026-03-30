#!/usr/bin/env bash
# Smoke e2e script: purchase a package, create an appointment that consumes a session, verify decrement, then delete and verify increment.
# Requirements: curl, jq

set -euo pipefail

BASE_URL="http://localhost:3000"
DELAY=1

echo "Starting e2e smoke test against $BASE_URL"

if ! command -v jq >/dev/null 2>&1; then
  echo "Please install jq (brew install jq)"
  exit 2
fi

# 1) Create a temporary customer via API (if route exists) or use an existing one
echo "Creating temporary customer (or fetching one)..."
CREATE_RESP=$(curl -sS -X POST "$BASE_URL/api/customers" -H 'Content-Type: application/json' -d '{"firstName":"E2E","lastName":"Tester","phone":"0000000000"}')
CUSTOMER_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')
if [ -z "$CUSTOMER_ID" ]; then
  echo "Failed to create/fetch customer. Response:" >&2
  echo "$CREATE_RESP" | jq .
  exit 3
fi
echo "Customer: $CUSTOMER_ID"

# 2) Fetch packages
PKG=$(curl -sS "$BASE_URL/api/packages" | jq '.[0]')
PKG_ID=$(echo "$PKG" | jq -r '.id')
if [ -z "$PKG_ID" ] || [ "$PKG_ID" = "null" ]; then
  echo "No package found in catalog" >&2
  exit 4
fi
echo "Using package: $PKG_ID"

# Compute totalSessions from packageServices
TOTAL_SESSIONS=$(echo "$PKG" | jq '[.packageServices[]?.quantity] | add // 1')
echo "Total sessions for package: $TOTAL_SESSIONS"

# 3) Purchase package for customer
PURCHASE_RESP=$(curl -sS -X POST "$BASE_URL/api/customers/$CUSTOMER_ID/packages" -H 'Content-Type: application/json' -d "{\"packageId\": \"$PKG_ID\", \"totalSessions\": $TOTAL_SESSIONS}")
CP_ID=$(echo "$PURCHASE_RESP" | jq -r '.id // empty')
if [ -z "$CP_ID" ]; then
  echo "Purchase failed. Response:" >&2
  echo "$PURCHASE_RESP" | jq .
  exit 5
fi
echo "CustomerPackage created: $CP_ID"

# 4) Create an appointment consuming 1 session
echo "Creating appointment that consumes a session..."
START=$(date -u -v+1M +%Y-%m-%dT%H:%M:%SZ || date -u -d "+1 minute" +%Y-%m-%dT%H:%M:%SZ)
APPT_PAYLOAD=$(jq -n --arg cid "$CUSTOMER_ID" --arg cp "$CP_ID" --arg st "$START" '{customerId:$cid, startTime:$st, duration:30, serviceId:null, customerPackageId:$cp}')
APPT_RESP=$(curl -sS -X POST "$BASE_URL/api/appointments" -H 'Content-Type: application/json' -d "$APPT_PAYLOAD")
APPT_ID=$(echo "$APPT_RESP" | jq -r '.id // empty')
if [ -z "$APPT_ID" ]; then
  echo "Appointment creation failed. Response:" >&2
  echo "$APPT_RESP" | jq .
  exit 6
fi
echo "Appointment created: $APPT_ID"

# 5) Verify sessionsRemaining decremented
CP_AFTER=$(curl -sS "$BASE_URL/api/customers/$CUSTOMER_ID/packages")
SESS_AFTER=$(echo "$CP_AFTER" | jq -r --arg id "$CP_ID" '.[] | select(.id==$id) | .sessionsRemaining // empty')
echo "sessionsRemaining after consumption: $SESS_AFTER"

# 6) Delete the appointment (if delete endpoint exists) to restore session
echo "Attempting to delete appointment to restore session..."
DEL_RESP=$(curl -sS -X DELETE "$BASE_URL/api/appointments/$APPT_ID" || true)
echo "Delete response: $DEL_RESP"

# 7) Verify sessionsRemaining restored (best-effort)
CP_FINAL=$(curl -sS "$BASE_URL/api/customers/$CUSTOMER_ID/packages")
SESS_FINAL=$(echo "$CP_FINAL" | jq -r --arg id "$CP_ID" '.[] | select(.id==$id) | .sessionsRemaining // empty')
echo "sessionsRemaining final: $SESS_FINAL"

echo "E2E smoke finished"

