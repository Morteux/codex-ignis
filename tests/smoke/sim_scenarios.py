"""Planet simulator: scenario A/B comparison, monthly stockpile timeline and deficit flags (P11)."""
from smoke.common import check


async def run(t):
    pg, tab = t.pg, t.tab
    # P11.1: scenario A/B comparison — pin A, build Commercial Zones (B), changed rows highlighted with B − A
    await pg.evaluate("()=>localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
    await tab("planet")
    empty = await pg.inner_text("#planet-compare")
    check("compare: no scenario A -> hint, no table", "Pin the current planet as scenario A" in empty and await pg.evaluate("()=>!document.querySelector('#planet-compare .planet-compare-table')"), empty)
    await pg.evaluate("()=>document.querySelector('.planet-compare-pin').click()")
    same = await pg.evaluate("()=>[document.querySelector('.planet-compare-summary').innerText,document.querySelectorAll('.planet-compare-row.is-changed').length]")
    check("compare: right after pinning nothing changes", same == ["0 values change", 0], same)
    await pg.evaluate("()=>{document.querySelectorAll('#planet-catalog details').forEach(d=>d.open=true);[...document.querySelectorAll('#planet-catalog button')].find(b=>/Commercial Zones/.test(b.innerText)).click()}")
    cmp = await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.planet-compare-row')].map(r=>[r.dataset.id,[r.className,[...r.querySelectorAll('td')].map(td=>td.innerText.trim())]]))""")
    tr, cg = cmp.get("trade"), cmp.get("consumer_goods")
    check("compare: trade changed and better (+, green)", tr is not None and "is-changed" in tr[0] and "is-better" in tr[0] and tr[1][3].startswith("+"), cmp)
    check("compare: consumer goods changed and worse (Merchants' upkeep)", cg is not None and "is-worse" in cg[0] and cg[1][3] == "−3", cmp)
    first = await pg.evaluate("()=>document.querySelector('.planet-compare-row').classList.contains('is-changed')")
    check("compare: changed rows listed first", first)
    await pg.evaluate("()=>document.querySelector('.planet-compare-clear').click()")
    check("compare: clearing A hides the table", await pg.evaluate("()=>!document.querySelector('#planet-compare .planet-compare-table')"))
    pure = await pg.evaluate("""async()=>{const m=await import('./js/scenario-compare.js');
        const a={resources:{energy:5,minerals:2},conditions:{stability:50,happiness:null,crime:10,freeHousing:1,pops:3}};
        const b={resources:{energy:5,minerals:-1,food:4},conditions:{stability:55,happiness:null,crime:12,freeHousing:1,pops:3}};
        return m.compareSnapshots(a,b).map(r=>[r.id,r.delta,r.changed,r.better])}""")
    check("compare engine: order by change size, crime increase is worse, unchanged/not applicable after",
          pure[:4] == [["stability", 5, True, True], ["food", 4, True, True], ["minerals", -3, True, False], ["crime", 2, True, False]]
          and ["happiness", None, False, None] in pure and ["energy", 0, False, None] in pure, pure)

    # P11.2: monthly stockpile timeline — start + net x months at 1/12/60/120, never below 0; no research/amenities/trade
    async def timeline():
        return await pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.planet-timeline-row')].map(r=>[r.dataset.id,[...r.querySelectorAll('td')].slice(2).map(td=>td.innerText.trim())]))""")
    tl = await timeline()
    heads = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-table th')].map(th=>th.innerText.trim())")
    check("timeline: columns 1 / 12 / 60 / 120 months", heads[3:7] == ["1 month", "12 months", "60 months", "120 months"], heads)
    check("timeline: no research, amenities or trade rows", not any(k in tl for k in ["physics", "society", "engineering", "amenities", "trade"]), tl)
    cg = tl.get("consumer_goods")
    check("timeline: consumer goods -3/month from 0 stays at 0", cg is not None and cg[0] == "−3" and cg[1:5] == ["0", "0", "0", "0"], tl)
    # P11.3: deficit flags
    check("flags: consumer goods from 0 -> deficit, stockpile empty", cg is not None and cg[5] == "deficit: stockpile empty", cg)
    alert = await pg.evaluate("()=>{const a=document.querySelector('.planet-timeline-alert');return a?a.innerText:''}")
    check("flags: alert names the resources in deficit", "Resources in deficit:" in alert and "Food (deficit: stockpile empty)" in alert and "Consumer goods (deficit: stockpile empty)" in alert and "not modelled" in alert, alert)
    await pg.evaluate("()=>{const i=document.querySelector('.planet-timeline-row[data-id=consumer_goods] .planet-timeline-start');i.value='100';i.dispatchEvent(new Event('change'))}")
    cg = (await timeline()).get("consumer_goods")
    check("timeline: start 100 -> 97 / 64 / 0 / 0", cg is not None and cg[1:5] == ["97", "64", "0", "0"], cg)
    check("flags: start 100 at -3/month runs out in 34 months", cg is not None and cg[5] == "deficit: runs out in 34 months", cg)
    marks = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-row[data-id=consumer_goods] .planet-timeline-value')].map(c=>c.classList.contains('is-exhausted'))")
    check("flags: 60 and 120 months marked as exhausted", marks == [False, False, True, True], marks)
    pos = await pg.evaluate("()=>[...document.querySelectorAll('.planet-timeline-row:not(.is-deficit) .planet-timeline-flag')].every(c=>c.innerText.trim()==='')")
    check("flags: resources without deficit have no flag", pos)
    proj = await pg.evaluate("async()=>{const m=await import('./js/stockpile-timeline.js');return [m.projectStockpile(10,2.5,12),m.projectStockpile(10,-1,12),m.timelineRows({energy:3,physics:5,trade:2},{}).map(r=>[r.id,r.values]),m.exhaustionMonth(24,-2),m.exhaustionMonth(25,-2),m.exhaustionMonth(0,-1),m.exhaustionMonth(5,0),m.exhaustionMonth(5,3)]}")
    check("timeline engine: linear projection floored at 0, research/trade left out", proj[:3] == [40, 0, [["energy", [3, 36, 180, 360]]]], proj)
    check("flags engine: runs out after ceil(start / -net) months, 0 = empty, null = no deficit", proj[3:] == [12, 13, 0, None, None], proj)
