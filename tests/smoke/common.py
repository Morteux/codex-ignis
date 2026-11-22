"""Shared helpers of the browser smoke tests (tests/policies-smoke.py runs every area)."""
import os
from types import SimpleNamespace

ROOT = os.getcwd()
URL = "file://" + ROOT + "/planet-sim.html"
HTML_LANG = {"es": "es", "en": "en", "jp": "ja"}  # <html lang> uses the BCP 47 tag "ja" for the site's "jp"
failures = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + str(extra) if extra and not cond else ""))
    if not cond:
        failures.append(name)


def approx(a, b):
    return a is not None and abs(a - b) < 0.011


def sim_helpers(pg):
    """Actions on the simulator page `pg` used by several simulator areas."""
    async def tab(name):
        await pg.evaluate("(n)=>document.querySelector(`.planet-main-tab[data-main-tab=${n}]`).click()", name)

    async def net():
        rows = await pg.evaluate("""()=>[...document.querySelectorAll('#planet-production-net > .planet-resource-row, #planet-production-net .planet-resource-entry > .planet-resource-row')].map(r=>[r.querySelector('.planet-resource-name').innerText,r.querySelector('.planet-resource-value').innerText])""")
        return {k: float(v.replace("−", "-").replace("+", "")) for k, v in rows}

    async def selected_policy(group_title):
        return await pg.evaluate("""(g)=>{const s=[...document.querySelectorAll('.empire-policy-group')].find(x=>x.querySelector('h3').textContent.trim()===g);const c=s&&s.querySelector('.empire-policy-card.is-selected strong');return c&&c.innerText}""", group_title)

    async def pick_policy(name):
        return await pg.evaluate("""(n)=>{const c=[...document.querySelectorAll('.empire-policy-card')].find(x=>x.querySelector('strong').innerText===n);if(!c||c.disabled)return false;c.click();return true}""", name)

    async def policy_disabled(name):
        return await pg.evaluate("""(n)=>{const c=[...document.querySelectorAll('.empire-policy-card')].find(x=>x.querySelector('strong').innerText===n);return c?c.disabled:null}""", name)

    async def ethic(title):
        await pg.evaluate("(t)=>document.querySelector(`#empire-ethics-wheel button[title^='${t} (']`).click()", title)

    async def body(name):
        """Celestial body tab: pick a body type, then back to the Districts catalog of the Planet tab."""
        await tab("body")
        await pg.evaluate("(n)=>{const c=[...document.querySelectorAll('.celestial-type-card')].find(x=>x.innerText.trim()===n);if(!c.classList.contains('is-selected'))c.click()}", name)
        await tab("planet")
        await pg.click("#planet-tab-districts")

    async def civic_toggle(label):
        await tab("empire")
        await pg.evaluate("(l)=>[...document.querySelectorAll('#empire-civics-list button')].find(b=>b.innerText.trim()===l).click()", label)

    return SimpleNamespace(tab=tab, net=net, selected_policy=selected_policy, pick_policy=pick_policy,
                           policy_disabled=policy_disabled, ethic=ethic, body=body, civic_toggle=civic_toggle)
