"""Browser smoke tests of the whole site: single runner of the areas in tests/smoke/ (P23.6).

Run from the project root:  python3 tests/policies-smoke.py
Needs: pip install playwright && playwright install chromium
Uses the English UI (browser locale en-US) and file:// URLs.
PLAYWRIGHT_CHROME=/path/to/chrome uses an installed Chrome instead of Playwright's Chromium.
BLOCK_REMOTE=1 skips the remote asset images (much faster without network).

Every area is a module of tests/smoke/ with `async def run(t)`; `t` holds the browser, the
browser context, the simulator page and the simulator helpers of tests/smoke/common.py. The
simulator areas run in this order on the same page: each one starts from the state the
previous one left, so the order of AREAS matters.
"""
import asyncio, importlib, os, sys
from types import SimpleNamespace
from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8")  # check names may hold JP text (Windows consoles default to cp1252)
from smoke.common import URL, failures, sim_helpers  # noqa: E402

AREAS = [
    "sim_economy", "sim_edicts", "sim_bodies", "sim_features", "sim_branches_swaps", "sim_wilderness", "sim_scenarios",
    "sim_ui", "i18n", "sim_icons_mobile", "wiki", "bingo", "legal", "site", "extractor",
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROME") or None, args=["--allow-file-access-from-files"])
        ctx = await browser.new_context(locale="en-US")
        if os.environ.get("BLOCK_REMOTE"): await ctx.route("https://**/*", lambda r: r.abort())  # skip remote images (faster offline)
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(600)
        t = SimpleNamespace(browser=browser, ctx=ctx, pg=pg, errors=errors, **vars(sim_helpers(pg)))
        for area in AREAS:
            await importlib.import_module("smoke." + area).run(t)
        await browser.close()

asyncio.run(main())
print("\nFAILED: " + ", ".join(failures) if failures else "\nAll passed")
sys.exit(1 if failures else 0)
