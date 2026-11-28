"""Planet simulator: the gestalt Production Policy as a % of job output per stratum (T2528, GDD §9.1).

The game (4.6.0 drone_policy) gives ±20 % planet_jobs_simple_drone_produces_mult / complex_drone_produces_mult: a
% of what those jobs produce (step 4), not job efficiency (step 3). Starts from a clean page; the next area
(sim_breakdown_icons) clears the storage again.
"""
from smoke.common import check

STRATA_LINE = "Strata: % of the output of a stratum's jobs (Production Policy, planet modifiers, branch offices)"


async def run(t):
    pg, tab, ethic, pick_policy = t.pg, t.tab, t.ethic, t.pick_policy
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("empire")
    await ethic("Gestalt Consciousness")
    await tab("planet")
    await pg.click("#planet-tab-districts")
    # A Generator District: worker (simple drone) jobs that produce energy.
    await pg.evaluate("""()=>{const c=[...document.querySelectorAll('.planet-district-card')].find(x=>/Generator District/.test(x.innerText));
        [...c.querySelectorAll('.planet-count-btn')].find(b=>b.textContent==='+').click()}""")
    await pg.wait_for_timeout(200)

    async def energy_lines():
        await pg.evaluate("()=>{const r=[...document.querySelectorAll('#planet-production-net .planet-resource-row')].find(r=>/^Energy/.test(r.innerText));if(r&&!r.closest('.planet-resource-entry')?.querySelector('.planet-resource-detail'))r.click()}")
        await pg.wait_for_timeout(100)
        return await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('#planet-production-net .planet-resource-detail-line')]
            .map(l=>[l.title||l.querySelector('span').innerText,parseFloat(l.lastElementChild.innerText.replace('−','-').replace('+',''))]))""")

    async def choose(name):
        await tab("empire")
        ok = await pick_policy(name)
        await tab("planet")
        await pg.wait_for_timeout(150)
        return ok, await energy_lines()

    ok_b, balanced = await choose("Balanced Production")
    ok_e, extraction = await choose("Extraction Focus")
    ok_m, manufacturing = await choose("Manufacturing Focus")
    efficiency = [next((v for k, v in d.items() if k.startswith("Jobs: efficiency")), None) for d in (balanced, extraction, manufacturing)]
    check("production policy (T2528): Extraction Focus adds +20 % of the worker jobs' energy as its own breakdown line, Manufacturing Focus the same amount negative",
          ok_b and ok_e and ok_m and STRATA_LINE not in balanced and extraction.get(STRATA_LINE, 0) > 0
          and abs(extraction[STRATA_LINE] + manufacturing.get(STRATA_LINE, 0)) < 0.011, (balanced, extraction, manufacturing))
    check("production policy (T2528): the policy no longer changes the job efficiency step (same efficiency line with every option)",
          len(set(efficiency)) <= 1, efficiency)
    await tab("planet")
    info = await pg.evaluate("()=>document.querySelector('#planet-jobs-info-slot')?.textContent||''")
    check("production policy (T2528): the jobs panel no longer lists the policy as stratum efficiency (Manufacturing Focus picked)",
          bool(info) and "20%" not in info, info[:400])
    await tab("empire")
    await pick_policy("Balanced Production")
    await ethic("Gestalt Consciousness")
