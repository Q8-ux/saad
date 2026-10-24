#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p qa-evidence
case "${SABEQ_TARGET_URL:-}" in
  'https://www.sabeq.legal'|'https://q8-ux.github.io/saad/sabeq-legal/') ;;
  *) echo "Target is not approved" >&2; exit 2 ;;
esac
adb wait-for-device
adb shell settings put global animator_duration_scale 0 || true
adb shell am start -W -a android.intent.action.VIEW -d "$SABEQ_TARGET_URL" | tee qa-evidence/browser-start.txt
# Browser initialization may involve a one-time Chrome welcome screen; a failed
# assertion is recorded as a failure rather than being reported as a success.
python - <<'PY'
from pathlib import Path
import os
import json
import subprocess
from datetime import datetime, timezone
p = Path("qa-evidence")
url = os.environ["SABEQ_TARGET_URL"]
script = r'''
# task: Read-only phone test of Sabeq's public mobile website.
# step: Inspect what actually appeared in the Android browser; do not log in or submit forms.
import json
from pathlib import Path
import time
p = Path("qa-evidence")
result = {"target": "approved-public-site", "tool": "phone-harness==0.3.2", "screen_readable": False, "site_brand_visible": False, "screenshot_saved": False}
try:
    ensure_device()
    wait_stable(timeout=20)
    image = screenshot(str(p / "sabeq-home.png"))
    result["screenshot_saved"] = (p / "sabeq-home.png").is_file()
    boxes = screen()
    result["screen_readable"] = len(boxes) > 0
    visible = " ".join(str(entry.get("text", "")) for entry in boxes).casefold()
    result["site_brand_visible"] = any(term in visible for term in ("سابق", "sabeq", "sabik"))
    result["visible_element_count"] = len(boxes)
    if result["site_brand_visible"]:
        scroll("down", amount=0.4)
        wait_stable(timeout=8)
        screenshot(str(p / "sabeq-scroll.png"))
except Exception as exc:
    result["error"] = type(exc).__name__ + ": " + str(exc)[:350]
finally:
    (p / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
if not all(result.get(key) for key in ("screen_readable", "site_brand_visible", "screenshot_saved")):
    raise SystemExit("Mobile QA failed: public site not confirmed visible on Android emulator.")
'''
run = subprocess.run(["phone-harness"], input=script, text=True, capture_output=True)
(p / "runner.log").write_text((run.stdout + "\n" + run.stderr)[-5000:], encoding="utf-8")
result_path = p / "result.json"
result = json.loads(result_path.read_text(encoding="utf-8")) if result_path.exists() else {}
with open(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/null"), "a", encoding="utf-8") as stream:
    stream.write("## Sabeq Phone Harness Mobile QA\n\n")
    stream.write(f"- Target: {url}\n- Tested at: {datetime.now(timezone.utc).isoformat()}\n")
    for key in ("screen_readable", "site_brand_visible", "screenshot_saved"):
        stream.write(f"- {key}: {'PASS' if result.get(key) else 'FAIL'}\n")
    stream.write("- Synthetic, read-only check. No user authentication or payments.\n")
if run.returncode:
    print((run.stdout + "\n" + run.stderr)[-3000:], flush=True)
raise SystemExit(run.returncode)
PY
