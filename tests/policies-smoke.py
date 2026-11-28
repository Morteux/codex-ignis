"""Browser smoke tests of the whole site: single runner of the areas in tests/smoke/ (P23.6).

Run from the project root:  python3 tests/policies-smoke.py
Needs: pip install playwright && playwright install chromium
Uses the English UI (browser locale en-US) and file:// URLs.
PLAYWRIGHT_CHROME=/path/to/chrome uses an installed Chrome instead of Playwright's Chromium.
BLOCK_REMOTE=1 (or --block-remote) skips the remote asset images (much faster without network).
Area names as arguments (python tests/policies-smoke.py --block-remote tech_tree bingo) run only
those areas (the simulator areas expect the ones before them).

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
    "sim_economy", "sim_edicts", "sim_living_standards", "sim_bodies", "sim_features", "sim_branches_swaps", "sim_wilderness", "sim_scenarios",
    "sim_build_time", "sim_production_policy", "sim_breakdown_icons", "sim_concept_icons", "sim_ui", "i18n", "localisation", "sim_icons_mobile", "wiki", "bingo", "legal", "tech_tree", "site", "extractor", "data_switch", "assets_index", "testellaris", "testellaris_page", "hall_of_fame_api",
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROME") or None, args=["--allow-file-access-from-files"])
        ctx = await browser.new_context(locale="en-US")
        if os.environ.get("BLOCK_REMOTE") or "--block-remote" in sys.argv: await ctx.route("https://**/*", lambda r: r.abort())  # skip remote images (faster offline)
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_timeout(600)
        t = SimpleNamespace(browser=browser, ctx=ctx, pg=pg, errors=errors, **vars(sim_helpers(pg)))
        only = [a for a in sys.argv[1:] if not a.startswith("--")]
        for area in [a for a in AREAS if not only or a in only]:
            await importlib.import_module("smoke." + area).run(t)
        await browser.close()

asyncio.run(main())
print("\nFAILED: " + ", ".join(failures) if failures else "\nAll passed")
sys.exit(1 if failures else 0)
