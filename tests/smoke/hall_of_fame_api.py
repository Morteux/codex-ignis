"""Testellaris hall of fame API (section 43): runs tests/hall-of-fame/api-test.mjs with Node
(in-memory store, no database or network) and reports each of its checks."""
import json, os, subprocess
from smoke.common import check, ROOT


async def run(t):
    script = os.path.join(ROOT, "tests", "hall-of-fame", "api-test.mjs")
    done = subprocess.run(["node", script], capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
    try:
        results = json.loads(done.stdout.strip().splitlines()[-1])
    except (IndexError, ValueError):
        check("hall of fame API: the Node tests ran", False, (done.stderr or done.stdout)[-600:])
        return
    check("hall of fame API: the Node tests ran", done.returncode == 0 and len(results) > 0, done.stderr[-600:])
    for name, ok, detail in results:
        check(name, ok, detail)
