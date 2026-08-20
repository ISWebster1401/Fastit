#!/usr/bin/env bash
set -eo pipefail

BACK_URL="${BACK_URL:-http://127.0.0.1:8000/health}"

python3 - <<'PY'
import json
import os
import urllib.request

url = os.environ["BACK_URL"]
with urllib.request.urlopen(url, timeout=10) as resp:
    body = resp.read().decode("utf-8")
    print(body)
    try:
        data = json.loads(body)
        if data.get("status") != "ok":
            raise SystemExit(1)
    except json.JSONDecodeError:
        # Si no es JSON, igual se considera smoke ok si respondió.
        pass
PY

