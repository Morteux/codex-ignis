"""Testellaris game page (section 42, testellaris.html): start screen and DLC filter."""
import json, os
from smoke.common import check, ROOT

RULESET = "stellaris-pc-4.5.4"
PAGE = "file://" + ROOT + "/testellaris.html"


def load_bank():
    with open(os.path.join(ROOT, "data", "testellaris", RULESET, "questions.json"), encoding="utf-8") as f:
        return json.load(f)["questions"]


async def open_page(ctx, errors):
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto(PAGE)
    await pg.wait_for_function("()=>/\\d/.test(document.querySelector('#tq-available').textContent)", timeout=15000)
    return pg


async def run(t):
    bank = load_bank()
    per_tier = lambda qs: [sum(1 for q in qs if q["tier"] == tier) for tier in range(1, 6)]
    base = [q for q in bank if not q["dlc"]]
    errors = []

    ctx = await t.browser.new_context(locale="en-US")
    if os.environ.get("BLOCK_REMOTE"): await ctx.route("https://**/*", lambda r: r.abort())
    # T4201: linked from the home page; start screen with the DLC filter
    home = await ctx.new_page()
    await home.goto("file://" + ROOT + "/index.html")
    link = await home.evaluate("()=>[...document.querySelectorAll('.primary-nav a')].map(a=>a.getAttribute('href'))")
    check("testellaris: the home page links to testellaris.html", "testellaris.html" in link, link)
    await home.close()
    pg = await open_page(ctx, errors)
    start = await pg.evaluate("""()=>({title:document.title,current:document.querySelector('.primary-nav a[aria-current=page]')?.getAttribute('href'),
        groups:[...document.querySelectorAll('.tq-dlc-group-title')].map(h=>h.textContent),
        boxes:[...document.querySelectorAll('#tq-dlc-groups input[type=checkbox]')].map(b=>[b.value,b.checked]),
        available:document.querySelector('#tq-available').textContent,few:document.querySelector('#tq-few').hidden,
        start:!document.querySelector('#tq-start-btn').disabled})""")
    dlc_names = sorted({d for q in bank for d in q["dlc"]})
    names = [b[0] for b in start["boxes"]]
    check("testellaris: start screen with the shell, 3 DLC groups and 26 gameplay DLCs, all checked by default",
          start["title"] == "Testellaris · Codex Ignis" and start["current"] == "testellaris.html" and start["groups"] == ["Expansions", "Story packs", "Species packs"]
          and len(names) == 26 and all(b[1] for b in start["boxes"]) and set(dlc_names) <= set(names), {k: start[k] for k in ("title", "current", "groups")} | {"n": len(names), "missing": sorted(set(dlc_names) - set(names))})
    check("testellaris: with every DLC the whole bank is available (count per tier), no warning, Start enabled",
          ("%d (per tier: %s)" % (len(bank), " / ".join(map(str, per_tier(bank))))) in start["available"] and start["few"] and start["start"], start["available"])
    await pg.click("#tq-dlc-none")
    none = await pg.evaluate("()=>[document.querySelector('#tq-available').textContent,document.querySelector('#tq-few').hidden,[...document.querySelectorAll('#tq-dlc-groups input')].some(b=>b.checked)]")
    check("testellaris: None leaves only the base game questions", ("%d (per tier: %s)" % (len(base), " / ".join(map(str, per_tier(base))))) in none[0] and none[1] and not none[2], none)
    await pg.check("#tq-dlc-groups input[value='Overlord']")
    overlord = [q for q in bank if all(d == "Overlord" for d in q["dlc"])]
    one = await pg.evaluate("()=>document.querySelector('#tq-available').textContent")
    check("testellaris: a question counts only when every DLC of its list is checked", ("%d (per tier" % len(overlord)) in one, (one, len(overlord)))
    await pg.reload()
    await pg.wait_for_function("()=>/\\d/.test(document.querySelector('#tq-available').textContent)", timeout=15000)
    kept = await pg.evaluate("()=>[...document.querySelectorAll('#tq-dlc-groups input:checked')].map(b=>b.value)")
    check("testellaris: the DLC choice is remembered in localStorage", kept == ["Overlord"], kept)
    # the warning for tiers with fewer than 20 questions (GDD §4), shown with a filter that leaves few
    few = await pg.evaluate("""()=>{const m=document.querySelector('#tq-few');return [m.hidden,m.textContent]}""")
    low = [str(i + 1) for i, n in enumerate(per_tier(base + [q for q in overlord if q["dlc"]])) if n < 20]
    check("testellaris: the start screen warns about the tiers left with fewer than 20 questions", (not low and few[0]) or (low and not few[0] and ", ".join(low) in few[1]), (few, low))
    await pg.click("#tq-dlc-all")
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate("()=>[document.documentElement.lang,document.querySelector('.tq-dlc-group-title').textContent,document.querySelector('#tq-available').textContent]")
    check("testellaris: the start screen follows the language (jp)", jp[0] == "ja" and jp[1] == "拡張パック" and str(len(bank)) in jp[2], jp)
    await pg.click(".lang-btn[data-lang=en]")
    await category_checks(pg, bank)
    await engine_checks(pg)
    await game_checks(pg, {q["id"]: q for q in bank})
    await scores_checks(pg)
    await top_list_checks(pg)
    await name_checks(pg, {q["id"]: {"answers": q["answers"], "correct": q["correct"]} for q in bank})
    await icon_checks(pg, bank)
    check("testellaris: no page errors", not errors, errors[:3])
    await ctx.close()
    await mobile_checks(t, {q["id"]: {"answers": q["answers"], "correct": q["correct"]} for q in bank})


# T2609: concept icons (ICONS.md) in question texts, explanations and stratum answers; the word stays, the icon repeats it as tooltip
ICON_NODES_JS = """async ({qs, lang})=>{const m=await import('./js/testellaris-icons.js');const box=document.createElement('div');
  const info=(nodes)=>{box.replaceChildren(...nodes);const img=[...box.querySelectorAll('img')];return {text:box.textContent,icons:img.map(i=>({c:i.dataset.concept,alt:i.alt,title:i.title,src:i.getAttribute('src'),next:(i.nextSibling&&i.nextSibling.textContent||'').slice(0,12)}))}};
  const out={};for(const q of qs){const a=q.answers.en.map((x,k)=>m.answerIcon(q,k,lang)).map(i=>i&&{c:i.dataset.concept,alt:i.alt,title:i.title});
    out[q.id]={text:info(m.questionNodes(q,lang)),expl:info(m.explanationNodes(q,lang)),answers:a}}return out}"""


async def icon_checks(pg, bank):
    first = lambda prefix, cond=lambda q: True: next(q for q in bank if q["id"].startswith(prefix) and cond(q))
    picks = {
        "upkeep": first("economy.job_base_upkeep.", lambda q: "resource" in q),
        "output": first("economy.job_base_output.", lambda q: q.get("resource") == "consumer_goods"),
        "days": first("economy.building_days."),
        "housing": first("planets.capital_housing."),
        "stability": first("modifiers.modifier_amount.", lambda q: q["id"].endswith(".stability")),
        "speed": first("modifiers.modifier_amount.", lambda q: q["id"].endswith(".speed")),
        "living": first("economy.living_upkeep_most.", lambda q: q["id"].endswith(".worker")),
        "stratum": first("economy.job_stratum."),
        "same": first("economy.job_same_output."),
        "name": first("subjects.holding."),
    }
    qs = list(picks.values())
    res = {lang: await pg.evaluate(ICON_NODES_JS, {"qs": qs, "lang": lang}) for lang in ("en", "es", "jp")}
    en = {k: res["en"][q["id"]] for k, q in picks.items()}
    keeps = all(res[lang][q["id"]]["text"]["text"] == q["text"][lang] and res[lang][q["id"]]["expl"]["text"] == q["explanation"][lang] for lang in res for q in qs)
    check("testellaris (T2609): the icons keep every question and explanation text as it is (es/en/jp)", keeps, en)
    up, out = en["upkeep"]["text"]["icons"], en["output"]["text"]["icons"]
    check("testellaris (T2609): base upkeep / output questions show the game upkeep / output icon of their one resource before the word, word as tooltip, empty alt",
          len(up) == 1 and up[0]["src"].endswith("modifiers/mod_%s_upkeep_add.png" % picks["upkeep"]["resource"]) and up[0]["next"].startswith("upkeep") and up[0]["title"] == "Upkeep" and up[0]["alt"] == ""
          and len(out) == 1 and out[0]["src"].endswith("modifiers/mod_consumer_goods_produces_add.png") and out[0]["next"].startswith("output") and out[0]["title"] == "Output", (up, out))
    check("testellaris (T2609): build days show the clock icon in the question and the explanation, capital housing the housing icon, a stability modifier the stability icon",
          [i["c"] for i in en["days"]["text"]["icons"]] == ["buildTime"] and [i["c"] for i in en["days"]["expl"]["icons"]] == ["buildTime"]
          and en["days"]["text"]["icons"][0]["src"].endswith("text_icons/time.png") and en["days"]["text"]["icons"][0]["title"] == "Build time"
          and [i["c"] for i in en["housing"]["text"]["icons"]] == ["housing"] and [i["c"] for i in en["stability"]["text"]["icons"]] == ["stability"], en)
    check("testellaris (T2609): living standard questions show the stratum icon before 'stratum' and the pop upkeep icon before 'upkeep'",
          [(i["c"], i["next"][:7]) for i in en["living"]["text"]["icons"]] == [("worker", "stratum"), ("popUpkeep", "upkeep?")], en["living"])
    sa = en["stratum"]["answers"]
    check("testellaris (T2609): job stratum answers show their stratum icon (word as tooltip), the question text none (it would be the answer)",
          all(a and a["alt"] == "" and a["title"] for a in sa) and not en["stratum"]["text"]["icons"]
          and {"Specialist": "specialist", "Worker": "worker", "Elite": "ruler", "Complex Drone": "complexDrone", "Menial Drone": "simpleDrone"}.get(picks["stratum"]["answers"]["en"][picks["stratum"]["correct"]]) == en["stratum"]["expl"]["icons"][0]["c"], en["stratum"])
    check("testellaris (T2609): no icon for ship speed, 'same resource as' questions (it would hint the answer) or game names holding a concept word (Communal Housing Outreach)",
          not en["speed"]["text"]["icons"] and not en["same"]["text"]["icons"] and not en["name"]["text"]["icons"] and not any(en["name"]["answers"]), (en["speed"], en["same"], en["name"]))
    es, jp = res["es"][picks["upkeep"]["id"]]["text"]["icons"], res["jp"][picks["living"]["id"]]["text"]["icons"]
    check("testellaris (T2609): the icons and their tooltips follow the language (es: mantenimiento, jp: 階層 / 維持費)",
          len(es) == 1 and es[0]["next"].startswith("mantenimient") and es[0]["title"] == "Mantenimiento"
          and [(i["c"], i["next"][:2]) for i in jp] == [("worker", "階層"), ("popUpkeep", "維持")] and jp[0]["title"] == "労働者階層", (es, jp))


# T4403: thematic categories on the start screen, remembered, and drawn evenly by the engine
CATEGORIES_JS = """()=>[...document.querySelectorAll('#tq-category-list .tq-category-item')].map(l=>({value:l.querySelector('input').value,checked:l.querySelector('input').checked,
  name:l.querySelector('.tq-category-name').textContent,count:l.querySelector('.tq-category-count').textContent,hint:l.querySelector('.tq-category-hint').textContent.length>20,
  colour:getComputedStyle(l.querySelector('.tq-category-name')).color}))"""
CATEGORY_COLOURS = {"engineering": "rgb(255, 154, 61)", "physics": "rgb(79, 141, 255)", "society": "rgb(79, 209, 122)", "unity": "rgb(178, 248, 247)"}  # unity: T4504, from the game's unity icon
EVEN_JS = """async()=>{const E=await import('./js/testellaris-engine.js');let seed=7;const rng=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const pool=[...Array.from({length:90},(_,i)=>({id:'e'+i,category:'engineering'})),...Array.from({length:10},(_,i)=>({id:'u'+i,category:'unity'}))];
  let unity=0;for(let i=0;i<2000;i+=1)if(E.drawQuestion(pool,rng).category==='unity')unity+=1;
  const m=await import('./js/testellaris.js');const only=m.playableQuestions();
  return {unity,onlyUnity:only.length>0&&only.every(q=>q.category==='unity'),counts:E.categoryCounts(pool),empty:E.drawQuestion([],rng)}}"""


async def category_checks(pg, bank):
    counts = {c: sum(1 for q in bank if q["category"] == c) for c in CATEGORY_EN}
    cats = await pg.evaluate(CATEGORIES_JS)
    check("testellaris categories: four categories (Engineering, Physics, Society, Unity), all checked by default, with their colour, what they ask and their count of questions",
          [c["value"] for c in cats] == list(CATEGORY_EN) and all(c["checked"] and c["hint"] for c in cats) and [c["name"] for c in cats] == list(CATEGORY_EN.values())
          and [c["count"] for c in cats] == ["%d questions" % counts[c] for c in CATEGORY_EN] and [c["colour"] for c in cats] == list(CATEGORY_COLOURS.values()), cats)
    check("testellaris categories: every question of the bank has one of the four categories", all(q["category"] in CATEGORY_EN for q in bank))
    await pg.uncheck("#tq-category-list input[value=unity]")
    left = await pg.evaluate("()=>document.querySelector('#tq-available').textContent")
    check("testellaris categories: unchecking one leaves only the questions of the others", ("%d (per tier" % (len(bank) - counts["unity"])) in left, left)
    await pg.reload()
    await pg.wait_for_function("()=>/\\d/.test(document.querySelector('#tq-available').textContent)", timeout=15000)
    kept = await pg.evaluate("()=>[...document.querySelectorAll('#tq-category-list input:checked')].map(b=>b.value)")
    check("testellaris categories: the choice is remembered in localStorage", kept == ["engineering", "physics", "society"], kept)
    await pg.click("#tq-categories-none")
    none = await pg.evaluate("()=>[document.querySelector('#tq-start-btn').disabled,document.querySelector('#tq-few').hidden,document.querySelector('#tq-few').textContent]")
    check("testellaris categories: None disables Start and asks for one category", none[0] and not none[1] and "at least one category" in none[2], none)
    await pg.check("#tq-category-list input[value=unity]")
    even = await pg.evaluate(EVEN_JS)
    check("testellaris categories: with only Unity checked the game draws only Unity questions", even["onlyUnity"], even)
    check("testellaris engine: the category is drawn evenly among the ones left (10 % of the pool, about half of the draws)",
          850 < even["unity"] < 1150 and even["counts"] == {"engineering": 90, "physics": 0, "society": 0, "unity": 10} and even["empty"] is None, even)
    await pg.click("#tq-categories-all")
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate(CATEGORIES_JS)
    check("testellaris categories: names in jp are the game's (工学, 物理学, 社会学, 統合力)", [c["name"] for c in jp] == ["工学", "物理学", "社会学", "統合力"], jp)
    await pg.click(".lang-btn[data-lang=en]")


# T4207: every screen at 320 / 375 px — no sideways scroll, touch targets of 44 px (answers, lifelines, buttons, DLC boxes)
LAYOUT_JS = """()=>{const w=document.documentElement.clientWidth;const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
  const over=[...document.querySelectorAll('main *')].filter(e=>vis(e)&&e.getBoundingClientRect().right>w+1).slice(0,4).map(e=>e.tagName+'.'+e.className);
  const small=[...document.querySelectorAll('main button, main input[type=text], .tq-dlc-item, .tq-category-item')].filter(vis).filter(e=>e.getBoundingClientRect().height<44).slice(0,4).map(e=>(e.id||e.className)+' '+Math.round(e.getBoundingClientRect().height));
  return {sw:document.documentElement.scrollWidth,w,over,small}}"""
A11Y_JS = """()=>({lang:document.documentElement.lang,skip:document.querySelector('.skip-link').textContent,live:document.querySelector('#tq-announce').getAttribute('aria-live'),
  answers:[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.textContent.trim().length>1),group:document.querySelector('#tq-answers').getAttribute('aria-labelledby'),
  lives:document.querySelector('#tq-hud-lives').textContent,hearts:document.querySelector('.tq-hearts').getAttribute('aria-hidden'),
  lifelines:document.querySelector('.tq-lifelines').getAttribute('aria-labelledby'),english:/\\b(Tier|Question|Score|Lives|Give up)\\b/.test(document.querySelector('#tq-game').innerText)})"""


async def mobile_checks(t, small):
    ctx = await t.browser.new_context(locale="en-US", viewport={"width": 320, "height": 700}, has_touch=True, is_mobile=True)
    if os.environ.get("BLOCK_REMOTE"): await ctx.route("https://**/*", lambda r: r.abort())
    pg = await ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    await pg.goto(PAGE)
    await pg.wait_for_function("()=>!document.querySelector('#tq-start-btn').disabled", timeout=15000)
    for width in (320, 375):
        await pg.set_viewport_size({"width": width, "height": 700})
        for lang in ("es", "en", "jp"):
            await pg.click(".lang-btn[data-lang=%s]" % lang)
            if await pg.evaluate("()=>document.querySelector('#tq-start').hidden"):
                await pg.click("#tq-back-start")
            screens = {"start": await pg.evaluate(LAYOUT_JS)}
            await pg.click("#tq-start-btn")
            screens["question"] = await pg.evaluate(LAYOUT_JS)
            rows = await pg.evaluate(ANSWER_GRID_JS)
            check("testellaris mobile %dpx (%s): answers in a 2 × 2 grid from 360 px, stacked below (T4501)" % (width, lang), rows == (4 if width < 360 else 2), rows)
            a11y = await pg.evaluate(A11Y_JS)
            pos = await pg.evaluate(POSITIONS_JS, small)
            await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["wrong"])
            screens["feedback"] = await pg.evaluate(LAYOUT_JS)
            await pg.click("#tq-give-up")
            await pg.click(".confirm-dialog .confirm-btn.is-danger")
            await pg.wait_for_function("()=>!/Loading|読み込み中|Cargando/.test(document.querySelector('#tq-end-top-source').textContent)", timeout=10000)
            screens["end"] = await pg.evaluate(LAYOUT_JS)
            bad = {k: v for k, v in screens.items() if v["sw"] > v["w"] or v["over"] or v["small"]}
            check("testellaris mobile %dpx (%s): start, question, feedback and end screens fit without sideways scroll, touch targets of 44 px" % (width, lang), not bad, bad)
            if width == 320:
                check("testellaris a11y (%s): skip link, live region for results, labelled answer group and lifelines, lives in text, interface in the language" % lang,
                      a11y["lang"] == {"es": "es", "en": "en", "jp": "ja"}[lang] and a11y["skip"] and a11y["live"] == "assertive" and all(a11y["answers"]) and len(a11y["answers"]) == 4
                      and a11y["group"] == "tq-question" and a11y["lifelines"] and a11y["hearts"] == "true" and any(ch.isdigit() for ch in a11y["lives"]) and (a11y["english"] == (lang == "en")), a11y)
    await pg.click(".lang-btn[data-lang=en]")
    # keyboard only: Tab reaches the answers from the question, Enter on a focused answer answers it
    await pg.click("#tq-back-start")
    await pg.focus("#tq-start-btn")
    await pg.keyboard.press("Enter")
    await pg.keyboard.press("Tab")
    focused = await pg.evaluate("()=>document.activeElement.className")
    await pg.keyboard.press("Enter")
    answered = await pg.evaluate("()=>!document.querySelector('#tq-feedback').hidden&&document.activeElement.id")
    check("testellaris a11y: keyboard only — Enter starts, Tab from the question reaches the first answer, Enter answers and the focus moves to Next",
          "tq-answer" in focused and answered == "tq-next", (focused, answered))
    check("testellaris mobile: no page errors", not errors, errors[:3])
    await pg.evaluate("()=>{localStorage.removeItem('testellaris-top10');localStorage.removeItem('testellaris-recent')}")
    await ctx.close()


SCORES_JS = """async()=>{const S=await import('./js/testellaris-scores.js');const out={};
  const e=(name,score,maxTier=1,answered=5,date='2026-01-01T00:00:00Z',rulesetId='rs')=>({name,score,maxTier,answered,correct:3,dlcs:26,rulesetId,date});
  // ties: score, then tier reached, then fewer answered, then the earlier date
  out.order=S.sortEntries([e('d',500,2,9),e('a',900),e('c',500,2,8,'2026-02-01'),e('b',500,3,20),e('e',500,2,8,'2026-03-01')]).map(x=>x.name).join('');
  const ten=Array.from({length:10},(_,i)=>e('p'+i,1000-i*100));
  out.qual=[S.qualifies(ten,e('x',150)),S.qualifies(ten,e('x',100)),S.qualifies(ten.slice(0,9),e('x',1)),S.qualifies([],e('x',0))];
  localStorage.removeItem(S.LOCAL_STORAGE_KEY);
  for(let i=0;i<12;i++)S.saveLocal(e('n'+i,(i+1)*10));S.saveLocal(e('other',5,1,5,'2026-01-01',' rs2'));
  const local=S.loadLocal('rs');out.local=[local.length,local[0].name,local[9].name,S.loadLocal(' rs2').length];
  localStorage.setItem(S.LOCAL_STORAGE_KEY,'{broken');out.broken=S.loadLocal('rs').length;localStorage.removeItem(S.LOCAL_STORAGE_KEY);
  // shared board when the client answers, local top 10 when it cannot be reached
  out.none=(await S.loadBoard('rs')).shared;
  S.hallOfFame.client={load:async()=>[e('remote',10)],submit:async(x)=>[x]};
  const remote=await S.loadBoard('rs');const sent=await S.submitEntry(e('me',20));
  out.remote=[remote.shared,remote.entries[0].name,sent.shared,S.loadLocal('rs').length];
  S.hallOfFame.client={load:()=>Promise.reject(new Error('offline')),submit:()=>Promise.reject(new Error('offline'))};
  const off=await S.loadBoard('rs');const kept=await S.submitEntry(e('me',20));
  out.offline=[off.shared,kept.shared,kept.entries.map(x=>x.name).join(','),S.loadLocal('rs').length];
  // the API client (T4303): requests, answers and every way the board cannot be reached
  localStorage.removeItem(S.LOCAL_STORAGE_KEY);const calls=[];const reply=(status,body)=>new Response(body===undefined?'oops':JSON.stringify(body),{status});
  const api=(answer)=>S.apiClient({url:'/api/hall-of-fame',timeoutMs:200,fetchImpl:async(url,init)=>{calls.push([url,init.method,init.body&&JSON.parse(init.body),init.headers['Content-Type']]);return answer(url,init)}});
  const mine={...e('me',300,2,3),correctByTier:[2,1,0,0,0],date:'1999-01-01T00:00:00Z',extra:'x'};
  S.hallOfFame.client=api((url,init)=>init.method==='GET'?reply(200,{rulesetId:'rs',entries:[e('srv',900),{name:'bad'}]}):reply(201,{saved:true,entry:{...mine,date:'2026-11-25T12:00:00.000Z'},entries:[e('srv',900),{...mine,date:'2026-11-25T12:00:00.000Z'}]}));
  const got=await S.loadBoard('stellaris-pc-4.5.4');const put=await S.submitEntry(mine);
  out.api=[got.shared,got.entries.map(x=>x.name).join(','),calls[0][0],calls[0][1],put.shared,put.saved,put.entry.date,Object.keys(calls[1][2]).join(','),calls[1][3],S.loadLocal('rs').length];
  S.hallOfFame.client=api(()=>reply(400,{error:'name'}));const named=await S.submitEntry(mine);
  S.hallOfFame.client=api(()=>reply(200,{saved:false,entries:[e('srv',900)]}));const late=await S.submitEntry(mine);
  out.answers=[named.rejected,named.shared,S.loadLocal('rs').length,late.shared,late.saved];
  const down=[];
  for(const answer of [()=>reply(503,{error:'unavailable'}),()=>reply(429,{error:'rate'}),()=>reply(400,{error:'score'}),()=>reply(404),()=>Promise.reject(new TypeError('Failed to fetch')),(u,init)=>new Promise((_,no)=>init.signal.addEventListener('abort',()=>no(new Error('aborted'))))]){
    S.hallOfFame.client=api(answer);down.push((await S.loadBoard('rs')).shared,(await S.submitEntry(e('me',20))).shared)}
  out.down=[down.every(x=>x===false),S.loadLocal('rs').length];
  S.hallOfFame.client=null;localStorage.removeItem(S.LOCAL_STORAGE_KEY);
  return out}"""


async def scores_checks(pg):
    r = await pg.evaluate(SCORES_JS)
    check("testellaris top 10: order by score, then tier reached, then fewer questions answered, then the earlier date", r["order"] == "abced", r["order"])
    check("testellaris top 10: a score enters when it beats the 10th or the board has room, never with 0 points", r["qual"] == [True, False, True, False], r["qual"])
    check("testellaris top 10: the local board keeps the best 10 per ruleset in localStorage and survives damaged data",
          r["local"] == [10, "n11", "n2", 1] and r["broken"] == 0, (r["local"], r["broken"]))
    check("testellaris top 10: the shared board is used when it answers; the local top 10 when it cannot be reached (and the score is kept there)",
          r["none"] is False and r["remote"] == [True, "remote", True, 0] and r["offline"] == [False, False, "me", 1], (r["none"], r["remote"], r["offline"]))
    check("testellaris hall of fame API client: GET /api/hall-of-fame?ruleset=…, POST JSON with exactly the API fields (no date), the server's entry and date kept, malformed entries dropped, nothing saved locally",
          r["api"] == [True, "srv", "/api/hall-of-fame?ruleset=stellaris-pc-4.5.4", "GET", True, True, "2026-11-25T12:00:00.000Z",
                       "name,score,maxTier,answered,correct,correctByTier,dlcs,rulesetId", "application/json", 0], r["api"])
    check("testellaris hall of fame API client: a refused name is returned to the player (not saved locally); a score overtaken meanwhile says saved false",
          r["answers"] == ["name", True, 0, True, False], r["answers"])
    check("testellaris hall of fame API client: 503, 429, other 400s, 404, a network error and a timeout all fall back to the local top 10, where the score is kept",
          r["down"] == [True, 6], r["down"])


SHARED_JS = """async()=>{const S=await import('./js/testellaris-scores.js');
  window.__hof={posts:[],answers:['name','ok'],board:[{name:'Srv',score:5000,maxTier:3,answered:12,correct:12,dlcs:26,rulesetId:'%s',date:'2026-11-01T00:00:00Z'}]};
  S.hallOfFame.client=S.apiClient({fetchImpl:async(url,init)=>{const h=window.__hof;const json=(status,body)=>new Response(JSON.stringify(body),{status});
    if(init.method==='GET')return json(200,{rulesetId:'%s',entries:h.board});
    const b=JSON.parse(init.body);h.posts.push(b);
    if(h.answers.shift()==='name')return json(400,{error:'name'});
    const entry={...b,date:'2026-11-25T12:00:00.000Z'};delete entry.correctByTier;h.board=[...h.board,entry];
    return json(201,{saved:true,entry,entries:h.board})}})}"""


async def shared_board_checks(pg, small):
    """With the API client (T4303): the shared top 10, a name the server refuses, then saved in the shared board."""
    await pg.evaluate(SHARED_JS % (RULESET, RULESET))
    await pg.evaluate("()=>localStorage.removeItem('testellaris-top10')")
    await play_and_give_up(pg, small, 2)
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: with the API the end screen shows the shared top 10 (no 'cannot be reached' notice) and offers the name",
          s["form"] and s["source"].startswith("The 10 best scores of every player") and [row[2] for row in s["rows"]] == ["Srv"], s)
    await pg.fill("#tq-name", "Badword")
    await pg.press("#tq-name", "Enter")
    await pg.wait_for_function("()=>document.querySelector('#tq-name-error').textContent", timeout=10000)
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: a name the hall of fame refuses shows a generic message, keeps the form and the focus, and saves nothing locally",
          s["form"] and s["error"] == "This name cannot be used in the hall of fame. Choose another one." and s["invalid"] == "true" and s["focus"] == "tq-name"
          and await pg.evaluate("()=>localStorage.getItem('testellaris-top10')") is None, s)
    await pg.fill("#tq-name", "Ignis")
    await pg.press("#tq-name", "Enter")
    await pg.wait_for_function("()=>!document.querySelector('#tq-saved').hidden", timeout=10000)
    s = await pg.evaluate(END_TOP_JS)
    posts = await pg.evaluate("()=>window.__hof.posts")
    check("testellaris hall of fame: Save sends the entry with its right answers per tier and no date, says it is in the hall of fame and highlights the server's entry",
          not s["form"] and s["saved"] == "Saved in the hall of fame." and [row[:3] for row in s["rows"]] == [[False, "1", "Srv"], [True, "2", "Ignis"]]
          and len(posts) == 2 and posts[1]["name"] == "Ignis" and posts[1]["score"] == 200 and posts[1]["correctByTier"] == [2, 0, 0, 0, 0] and "date" not in posts[1]
          and await pg.evaluate("()=>localStorage.getItem('testellaris-top10')") is None, (s, posts))
    await pg.evaluate("async()=>{const S=await import('./js/testellaris-scores.js');S.hallOfFame.client=null;delete window.__hof}")
    await pg.click("#tq-back-start")


async def top_list_checks(pg):
    """The start screen lists the local top 10 (no hall of fame yet, T4303) with a notice."""
    entries = [{"name": "<b>Zed</b>", "score": 300, "maxTier": 2, "answered": 6, "correct": 3, "dlcs": 26, "rulesetId": RULESET, "date": "2026-11-20T10:00:00Z"},
               {"name": "宇宙の王", "score": 1200, "maxTier": 3, "answered": 12, "correct": 10, "dlcs": 4, "rulesetId": RULESET, "date": "2026-11-21T10:00:00Z"}]
    await pg.evaluate("(e)=>localStorage.setItem('testellaris-top10',JSON.stringify({'%s':e}))" % RULESET, entries)
    await pg.reload()
    await pg.wait_for_function("()=>document.querySelector('#tq-top-list li')", timeout=15000)
    top = await pg.evaluate("()=>({source:document.querySelector('#tq-top-source').textContent,rows:[...document.querySelectorAll('#tq-top-list li')].map(li=>[...li.children].map(c=>c.textContent)),bold:!!document.querySelector('#tq-top-list b'),empty:document.querySelector('#tq-top-empty').hidden})")
    check("testellaris top 10: the start screen lists the local top 10 in order, names as plain text, with the notice that the hall of fame cannot be reached",
          top["source"].startswith("The hall of fame cannot be reached") and [r[:2] for r in top["rows"]] == [["1", "宇宙の王"], ["2", "<b>Zed</b>"]]
          and top["rows"][0][2].startswith("1200 points · tier 3 · 10/12 · 4 DLC · ") and not top["bold"] and top["empty"], top)
    await pg.evaluate("()=>localStorage.removeItem('testellaris-top10')")
    await pg.reload()
    await pg.wait_for_function("()=>!document.querySelector('#tq-top-empty').hidden", timeout=15000)
    check("testellaris top 10: an empty board says there are no scores yet", await pg.evaluate("()=>document.querySelector('#tq-top-list').children.length") == 0)


NAMES_JS = """async()=>{const S=await import('./js/testellaris-scores.js');
  return {norm:S.normalizeName('  Ignis   del \\t Vacío  '),nfc:S.normalizeName('e\\u0301mile')==='\\u00e9mile',len:[S.nameLength('宇宙の王'),S.nameLength('e\\u0301mile'),S.nameLength('Ignis')],
    errors:['','   ','abcdefghijk','宇宙の王様です十文字だ','宇宙の王様です十文字','Ignis 🚀','x<y','bell\\u0007','zero\\u200bwidth','Émile-_. 9','Ωμέγα','e\\u0301mile'].map(n=>S.nameError(n))}}"""
END_TOP_JS = """()=>({form:!document.querySelector('#tq-name-form').hidden,count:document.querySelector('#tq-name-count').textContent,error:document.querySelector('#tq-name-error').textContent,
  invalid:document.querySelector('#tq-name').getAttribute('aria-invalid'),saved:document.querySelector('#tq-saved').hidden?null:document.querySelector('#tq-saved').textContent,
  source:document.querySelector('#tq-end-top-source').textContent,rows:[...document.querySelectorAll('#tq-end-top-list li')].map(li=>[li.classList.contains('is-new'),...[...li.children].map(c=>c.textContent)]),focus:document.activeElement.id})"""


async def play_and_give_up(pg, small, right_answers):
    """Starts a game, answers `right_answers` questions right, then gives up; waits for the end-screen top 10."""
    await pg.click("#tq-start-btn")
    for _ in range(right_answers):
        pos = await pg.evaluate(POSITIONS_JS, small)
        await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["right"])
        await pg.click("#tq-next")
    await pg.click("#tq-give-up")
    await pg.click(".confirm-dialog .confirm-btn.is-danger")
    await pg.wait_for_function("()=>!/Loading/.test(document.querySelector('#tq-end-top-source').textContent)", timeout=10000)


async def name_checks(pg, small):
    """T4206: name rules, the name input when the score enters the top 10, and the top 10 list on the end screen."""
    r = await pg.evaluate(NAMES_JS)
    check("testellaris names: trimmed, inner spaces collapsed, NFC, length in user-perceived characters",
          r["norm"] == "Ignis del Vacío" and r["nfc"] and r["len"] == [4, 5, 5], r)
    check("testellaris names: 1 to 10 characters of any script, digits, space - _ .; no emoji, symbols, control or invisible characters",
          r["errors"] == ["empty", "empty", "long", "long", None, "chars", "chars", "chars", "chars", None, None, None], r["errors"])
    await pg.evaluate("()=>{localStorage.removeItem('testellaris-top10');localStorage.removeItem('testellaris-recent')}")
    await pg.reload()
    await pg.wait_for_function("()=>!document.querySelector('#tq-start-btn').disabled", timeout=15000)
    # a game with 0 points never enters
    await play_and_give_up(pg, small, 0)
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: a game with 0 points does not offer the name input; the end screen shows the (empty) top 10",
          not s["form"] and s["rows"] == [] and s["source"].startswith("The hall of fame cannot be reached"), s)
    await pg.click("#tq-back-start")
    await play_and_give_up(pg, small, 2)
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: a score that enters the top 10 offers the name input (0/10 characters)", s["form"] and s["count"] == "0/10 characters" and s["saved"] is None, s)
    await pg.click("#tq-name-save")
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: an empty name is refused with a message and the field marked invalid", s["form"] and s["error"] == "Write a name." and s["invalid"] == "true" and s["focus"] == "tq-name", s)
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate(END_TOP_JS)
    await pg.click(".lang-btn[data-lang=en]")
    check("testellaris hall of fame: the name messages follow the language", jp["error"] == "名前を入力してください。" and jp["count"] == "0/10文字", jp)
    await pg.fill("#tq-name", "abcdefghijk")
    await pg.press("#tq-name", "Enter")
    long_error = (await pg.evaluate(END_TOP_JS))["error"]
    await pg.fill("#tq-name", "Ignis 🚀")
    await pg.press("#tq-name", "Enter")
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: more than 10 characters or an emoji are refused", long_error == "At most 10 characters." and s["error"].startswith("Only letters, digits") and s["form"], (long_error, s))
    await pg.fill("#tq-name", "  宇宙の  王 ")
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: the counter counts the normalised name", s["count"] == "5/10 characters" and s["error"] == "", s)
    await pg.press("#tq-name", "Enter")
    await pg.wait_for_function("()=>!document.querySelector('#tq-saved').hidden", timeout=10000)
    s = await pg.evaluate(END_TOP_JS)
    stored = await pg.evaluate("()=>JSON.parse(localStorage.getItem('testellaris-top10'))")
    entry = (stored or {}).get(RULESET, [{}])[0]
    check("testellaris hall of fame: Save keeps the score in the local top 10 (no hall of fame yet), says where, and lists it highlighted",
          not s["form"] and s["saved"].startswith("Saved in the top 10 of this browser") and s["focus"] == "tq-saved" and len(s["rows"]) == 1 and s["rows"][0][:3] == [True, "1", "宇宙の 王"]
          and s["rows"][0][3].startswith("200 points · tier 1 · 2/2 · 26 DLC")
          and {k: entry.get(k) for k in ("name", "score", "maxTier", "answered", "correct", "dlcs", "rulesetId")} == {"name": "宇宙の 王", "score": 200, "maxTier": 1, "answered": 2, "correct": 2, "dlcs": 26, "rulesetId": RULESET}, (s, entry))
    await pg.click("#tq-back-start")
    await pg.wait_for_function("()=>document.querySelector('#tq-top-list li')", timeout=10000)
    start_rows = await pg.evaluate("()=>[...document.querySelectorAll('#tq-top-list li .tq-top-name')].map(n=>n.textContent)")
    check("testellaris hall of fame: the saved score is on the start screen top 10", start_rows == ["宇宙の 王"], start_rows)
    await shared_board_checks(pg, small)
    # a full board of better scores: no name input
    full = [{"name": "p%d" % i, "score": 10000 - i, "maxTier": 5, "answered": 30, "correct": 30, "dlcs": 26, "rulesetId": RULESET, "date": "2026-11-01T00:00:00Z"} for i in range(10)]
    await pg.evaluate("(e)=>localStorage.setItem('testellaris-top10',JSON.stringify({'%s':e}))" % RULESET, full)
    await play_and_give_up(pg, small, 1)
    s = await pg.evaluate(END_TOP_JS)
    check("testellaris hall of fame: a score below a full top 10 offers no name input and the list shows the 10 entries", not s["form"] and len(s["rows"]) == 10 and s["saved"] is None, s)
    await pg.evaluate("()=>localStorage.removeItem('testellaris-top10')")


# A small fake bank for the engine: `n` questions per tier, the correct answer always index 0.
ENGINE_JS = """async(spec)=>{const E=await import('./js/testellaris-engine.js');
  const bank=(per)=>Object.entries(per).flatMap(([tier,n])=>Array.from({length:n},(_,i)=>({id:`t${tier}.${i}`,tier:+tier,dlc:[],correct:0})));
  const right=(g)=>g.current.order.indexOf(g.current.question.correct), wrong=(g)=>g.current.order.findIndex(i=>i!==g.current.question.correct);
  const out={};
  // tiers go up after 5 right answers; no repeats
  let g=E.createGame(bank({1:8,2:8,3:8,4:8,5:8}));const tiers=[],ids=new Set();let repeat=false;
  for(let k=0;k<22;k++){const q=E.nextQuestion(g);tiers.push(q.tier);if(ids.has(q.id))repeat=true;ids.add(q.id);E.answer(g,right(g));}
  out.tiers=tiers.join('');out.repeat=repeat;out.score=g.score;out.maxTier=g.maxTier;
  // a wrong answer costs a life and does not count towards the 5; 3 wrong answers end the game
  g=E.createGame(bank({1:20,2:5}));E.nextQuestion(g);const w=E.answer(g,wrong(g));
  for(let k=0;k<5;k++){E.nextQuestion(g);E.answer(g,right(g));}
  out.afterWrong=[w.correct,g.lives,g.tier,g.correctInTier];
  E.nextQuestion(g);E.answer(g,wrong(g));E.nextQuestion(g);E.answer(g,wrong(g));
  out.dead=[g.lives,g.over,g.endReason,E.nextQuestion(g)];
  // an empty tier moves up to the next one with questions; nothing left ends the game as completed
  g=E.createGame(bank({1:2,3:1}));const seen=[];let q;while((q=E.nextQuestion(g))){seen.push(q.tier);E.answer(g,right(g));}
  out.runOut=[seen.join(''),g.over,g.endReason,g.maxTier];
  // the recently asked ids are drawn only when nothing else is left
  g=E.createGame(bank({1:3}),{recent:['t1.0','t1.1']});const first=E.nextQuestion(g).id;E.answer(g,right(g));
  out.recent=[first,E.mergeRecent(Array.from({length:250},(_,i)=>'x'+i),g).length,E.mergeRecent(['t1.2','a'],g).join(',')];
  // the four answers are shuffled every time
  const orders=new Set();for(let k=0;k<40;k++){const h=E.createGame(bank({1:1}));E.nextQuestion(h);orders.add(h.current.order.join(''))}
  out.orders=orders.size;
  // lifelines: 50 % removes two wrong answers and halves the points; once per game; one per question
  g=E.createGame(bank({1:10}));E.nextQuestion(g);const removed=E.useFifty(g);
  out.fifty=[removed.length,removed.every(p=>g.current.order[p]!==0),E.canUseLifeline(g,'fifty'),E.canUseLifeline(g,'skip'),E.canUseLifeline(g,'shield'),E.answer(g,right(g)).points];
  E.nextQuestion(g);out.fiftyAgain=E.canUseLifeline(g,'fifty');
  // skip: another unasked question of the same tier, no points, same number; not when the tier has nothing else
  const before=g.current.question.id,n=g.number;const next=E.useSkip(g);
  out.skip=[next.id!==before,next.tier,g.number===n,g.score,g.answered,g.skipped[0]===before,g.asked.has(before),E.canUseLifeline(g,'shield')];
  let h=E.createGame(bank({1:1,2:3}));E.nextQuestion(h);out.skipEmpty=E.canUseLifeline(h,'skip');
  // shields: a wrong answer is crossed out without losing a life, the second wrong one costs it
  h=E.createGame(bank({1:3}));E.nextQuestion(h);E.useShield(h);const w1=wrong(h);const r1=E.answer(h,w1);
  const w2=h.current.order.findIndex((i,p)=>i!==0&&p!==w1);const r2=E.answer(h,w2);
  out.shield=[r1.retry,h.current.removed.has(w1),r2.retry,r2.correct,h.lives,h.answered];
  h=E.createGame(bank({1:3}));E.nextQuestion(h);E.useShield(h);out.shieldRight=[E.answer(h,right(h)).points,h.lives];
  let threw=false;try{E.useShield(h)}catch(e){threw=true}out.shieldThrows=threw;
  // a completed game adds 250 per life left; the summary lists the failed questions and the lifelines used
  h=E.createGame(bank({1:3}));E.nextQuestion(h);E.answer(h,wrong(h));E.nextQuestion(h);E.useFifty(h);E.answer(h,right(h));E.nextQuestion(h);E.answer(h,right(h));
  const done=E.nextQuestion(h);const s=E.summary(h);
  out.completed=[done,s.endReason,s.bonus,s.score,s.failed.map(f=>f.id).length,s.lifelines.join(','),s.answered,s.correct];
  h=E.createGame(bank({1:3}));E.nextQuestion(h);E.answer(h,right(h));E.endGame(h,'gaveUp');out.gaveUp=[E.summary(h).bonus,h.score];
  // T4502: Enhanced Recycling is off while nothing is spent, gives back a spent one at random (never itself), takes no question slot
  h=E.createGame(bank({1:10}));E.nextQuestion(h);out.recycleNone=E.canUseLifeline(h,'recycle');
  E.useFifty(h);const onSame=E.canUseLifeline(h,'recycle');const back=E.useRecycle(h);
  out.recycle=[onSame,back,h.lifelines.fifty,h.lifelines.recycle,E.canUseLifeline(h,'fifty'),E.canUseLifeline(h,'recycle'),h.current.lifeline];
  E.answer(h,right(h));E.nextQuestion(h);out.recycleAgain=[E.canUseLifeline(h,'fifty'),E.useFifty(h).length,E.answer(h,right(h)).points,E.summary(h).lifelines.join(',')];
  const backs=new Set();for(let k=0;k<30;k++){const r=E.createGame(bank({1:10}),{rng:Math.random});E.nextQuestion(r);E.useShield(r);E.answer(r,right(r));E.nextQuestion(r);E.useSkip(r);backs.add(E.useRecycle(r))}
  out.recycleBacks=[...backs].sort().join(',');
  out.categories=E.LIFELINES.map(n=>E.LIFELINE_CATEGORY[n]).join(',');
  return out}"""


async def engine_checks(pg):
    r = await pg.evaluate(ENGINE_JS, {})
    check("testellaris engine: tiers rise after 5 right answers (1→5, tier 5 has no ceiling), no question repeats, 100 × tier points",
          r["tiers"] == "1111122222333334444455" and not r["repeat"] and r["score"] == 100 * (5 * 1 + 5 * 2 + 5 * 3 + 5 * 4 + 2 * 5) and r["maxTier"] == 5, r)
    check("testellaris engine: a wrong answer costs a life and does not count towards moving up; the third one ends the game",
          r["afterWrong"] == [False, 2, 2, 0] and r["dead"] == [0, True, "lives", None], (r["afterWrong"], r["dead"]))
    check("testellaris engine: an empty tier moves up to the next one with questions; no question left ends the game as completed",
          r["runOut"] == ["113", True, "completed", 3], r["runOut"])
    check("testellaris engine: questions asked in recent games are avoided and the list keeps the last 200",
          r["recent"][0] == "t1.2" and r["recent"][1] == 200 and r["recent"][2] == "a,t1.2", r["recent"])
    check("testellaris engine: the four answers are shuffled", r["orders"] > 6, r["orders"])
    check("testellaris engine: World Cracker removes two wrong answers, blocks other lifelines on that question and halves the points (50 at tier 1)",
          r["fifty"] == [2, True, False, False, False, 50], r["fifty"])
    check("testellaris engine: each lifeline once per game", r["fiftyAgain"] is False and r["shieldThrows"], (r["fiftyAgain"], r["shieldThrows"]))
    check("testellaris engine: Galactic Administration swaps in another unasked question of the same tier, keeps the number, gives no points, and is off when the tier has nothing else",
          r["skip"] == [True, 1, True, 50, 1, True, True, False] and r["skipEmpty"] is False, (r["skip"], r["skipEmpty"]))
    check("testellaris engine: Deflectors cross out the first wrong answer without losing a life; the second wrong answer costs it",
          r["shield"] == [True, True, False, False, 2, 1] and r["shieldRight"] == [100, 3], (r["shield"], r["shieldRight"]))
    check("testellaris engine: a completed game adds 250 points per life left (2 lives: +500), a given-up one adds nothing; the summary has the failed questions and lifelines",
          r["completed"] == [None, "completed", 500, 50 + 100 + 500, 1, "fifty", 3, 2] and r["gaveUp"] == [0, 100], (r["completed"], r["gaveUp"]))
    check("testellaris engine (T4502): four lifelines, one per category (World Cracker engineering, Galactic Administration society, Deflectors physics, Enhanced Recycling unity)",
          r["categories"] == "engineering,society,physics,unity", r["categories"])
    check("testellaris engine (T4502): Enhanced Recycling is off while no lifeline is spent; it gives back the spent one (not itself), takes no question slot, and the one given back cannot be used twice on the same question",
          r["recycleNone"] is False and r["recycle"] == [True, "fifty", False, True, False, False, "fifty"], (r["recycleNone"], r["recycle"]))
    check("testellaris engine (T4502): the lifeline given back works again on a later question (50 again) and the summary lists it twice",
          r["recycleAgain"] == [True, 2, 50, "fifty,fifty,recycle"], r["recycleAgain"])
    check("testellaris engine (T4502): with two lifelines spent Enhanced Recycling gives back either of them at random", r["recycleBacks"] == "shield,skip", r["recycleBacks"])


# Position of the right / a wrong answer of the question on screen, from the bank record.
POSITIONS_JS = """(bank)=>{const id=document.querySelector('#tq-question').dataset.questionId,q=bank[id];const lang=document.documentElement.lang==='ja'?'jp':document.documentElement.lang;
  const texts=[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.querySelector('.tq-answer-text').textContent);
  const right=texts.indexOf(q.answers[lang][q.correct]);return {id,right,wrong:texts.findIndex((x,i)=>i!==right&&!document.querySelectorAll('#tq-answers .tq-answer')[i].disabled),texts}}"""
END_JS = """()=>{const dl=[...document.querySelectorAll('#tq-end-stats > *')];const stats={};for(let i=0;i<dl.length;i+=2)stats[dl[i].textContent]=dl[i+1].textContent;
  return {game:document.querySelector('#tq-game').hidden,end:!document.querySelector('#tq-end').hidden,reason:document.querySelector('#tq-end-reason').textContent,stats,focus:document.activeElement.id,
  none:document.querySelector('#tq-failed-none').hidden,failed:[...document.querySelectorAll('#tq-failed-list li')].map(li=>[li.dataset.questionId,...[...li.children].map(p=>p.textContent)])}}"""
HUD_JS ="()=>({tier:document.querySelector('#tq-hud-tier').textContent,n:(e=>e.querySelector('img').alt+' '+e.querySelector('.tq-hud-value').textContent)(document.querySelector('#tq-hud-number')),score:(e=>e.querySelector('img').alt+' '+e.querySelector('.tq-hud-value').textContent)(document.querySelector('#tq-hud-score')),lives:document.querySelector('#tq-hud-lives .visually-hidden').textContent,feedback:document.querySelector('#tq-feedback').hidden?null:document.querySelector('#tq-feedback').innerText,announce:document.querySelector('#tq-announce').textContent,focus:document.activeElement.id})"


# T4501: the question screen layout (panel tint, 2 × 2 answers, centred text, HUD).
SCREEN_JS = """()=>{const g=document.querySelector('#tq-game'),cs=getComputedStyle(g);
  const tops=[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.getBoundingClientRect());
  const uniq=a=>new Set(a.map(Math.round)).size;
  const hud=document.querySelector('.tq-hud').getBoundingClientRect(),lives=document.querySelector('#tq-hud-lives').getBoundingClientRect();
  const centre=document.querySelector('.tq-hud-centre').getBoundingClientRect();
  const counts=[...document.querySelectorAll('.tq-hud-count')];
  return {category:g.dataset.category,bg:cs.backgroundImage,border:cs.borderTopColor,rows:uniq(tops.map(r=>r.top)),cols:uniq(tops.map(r=>r.left)),
    align:getComputedStyle(document.querySelector('.tq-question-row')).alignItems,livesRight:Math.abs(hud.right-lives.right),
    hearts:document.querySelector('.tq-hearts').textContent,livesVisible:[...document.querySelector('#tq-hud-lives').children].filter(c=>!c.classList.contains('visually-hidden')).map(c=>c.textContent).join(''),
    icons:counts.map(c=>c.querySelector('img').getAttribute('src').replace(/^.*?(text_icons|concepts)\\//,'$1/')),values:counts.map(c=>c.querySelector('.tq-hud-value').textContent),
    bigger:parseFloat(getComputedStyle(counts[0]).fontSize)>parseFloat(getComputedStyle(document.querySelector('#tq-hud-tier')).fontSize),
    centred:Math.abs((centre.left+centre.right)/2-(hud.left+hud.right)/2)}}"""
ANSWER_GRID_JS = "()=>{const r=[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>Math.round(b.getBoundingClientRect().top));return new Set(r).size}"

CATEGORY_EN = {"engineering": "Engineering", "physics": "Physics", "society": "Society", "unity": "Unity"}


def source_parts_en(q):
    """T4503: the sentence and the detail line of a question's source, in English."""
    src = q["source"]
    detail = ["Section: %s" % src["section"]] if src.get("kind") == "wiki" else []
    if src.get("file"):
        detail.append("File: %s · key: %s" % (src["file"], src["key"]))
    if src.get("kind") == "wiki":
        text = "Taken from the Stellaris Wiki (4.5.2), article “%s”" % src["article"]
        text += ", and checked against the game files of Stellaris 4.5.4." if src.get("file") else "."
    else:
        text = "Taken from the game files of Stellaris 4.5.4."
    return text, " · ".join(detail)


def source_en(q):
    return "%s %s" % source_parts_en(q)


def source_in(q, shown):
    """The sentence and the detail line are both in the shown text (innerText puts them on two lines)."""
    text, detail = source_parts_en(q)
    return text in shown and detail in shown


SOURCE_JS = """async()=>{const m=await import('./js/testellaris.js');const w={source:{kind:'wiki',article:'Ambition',section:'Galactic Nemesis'}};const g={source:{file:'common/x.txt',key:'k'}};
  const wf={source:{kind:'wiki',article:'Astral threads',section:'Astral actions',file:'common/technology/00_phys_tech.txt',key:'tech_wormhole_stabilization'}};
  return [m.sourceText(w,'en'),m.sourceText(w,'es'),m.sourceText(w,'jp'),m.sourceText(g,'en'),m.sourceText(g,'es'),m.sourceText(g,'jp'),m.sourceParts(wf,'en')]}"""


async def game_checks(pg, by_id):
    texts = await pg.evaluate(SOURCE_JS)
    check("testellaris page (T4503): the source is a sentence (game files of Stellaris 4.5.4, or the Stellaris Wiki 4.5.2 and its article) and then the section, file and key, in every language",
          texts[:6] == ["Taken from the Stellaris Wiki (4.5.2), article “Ambition”. Section: Galactic Nemesis", "Sacada de la wiki de Stellaris (4.5.2), artículo «Ambition». Sección: Galactic Nemesis",
                        "Stellaris Wiki（4.5.2）の記事「Ambition」より。 節：Galactic Nemesis", "Taken from the game files of Stellaris 4.5.4. File: common/x.txt · key: k",
                        "Sacada de los archivos del juego de Stellaris 4.5.4. Archivo: common/x.txt · clave: k", "Stellaris 4.5.4のゲームファイルより。 ファイル：common/x.txt・キー：k"]
          and texts[6] == {"text": "Taken from the Stellaris Wiki (4.5.2), article “Astral threads”, and checked against the game files of Stellaris 4.5.4.",
                           "detail": "Section: Astral actions · File: common/technology/00_phys_tech.txt · key: tech_wormhole_stabilization"}, texts)
    small = {k: {"answers": v["answers"], "correct": v["correct"]} for k, v in by_id.items()}
    await pg.evaluate("()=>localStorage.removeItem('testellaris-recent')")
    await pg.click("#tq-start-btn")
    first = await pg.evaluate(POSITIONS_JS, small)
    hud = await pg.evaluate(HUD_JS)
    q1 = by_id.get(first["id"])
    badge = await pg.evaluate("()=>{const b=document.querySelector('#tq-question-category');return [b.textContent,b.dataset.category,getComputedStyle(b).color]}")
    if q1:
        check("testellaris game: the question shows its category, with its name and colour (T4403)",
              badge == ["Category: " + CATEGORY_EN[q1["category"]], q1["category"], CATEGORY_COLOURS[q1["category"]]], badge)
    if not q1:
        check("testellaris game: Start shows a question", False, (first, hud))
        return
    check("testellaris game: Start shows a tier 1 question with four answers, question 1, score 0 and 3 lives",
          q1["tier"] == 1 and len(first["texts"]) == 4 and sorted(first["texts"]) == sorted(q1["answers"]["en"]) and hud["tier"] == "Tier 1 · Primitive"
          and hud["n"] == "Question 1" and hud["score"] == "Score 0" and hud["lives"] == "3 lives left" and hud["feedback"] is None and hud["focus"] == "tq-question", hud)
    screen = await pg.evaluate(SCREEN_JS)
    check("testellaris question screen (T4501): panel tinted with the category colour, answers 2 × 2, text centred with the image, lives at the right end",
          screen["category"] == q1["category"] and "gradient" in screen["bg"] and screen["border"] == CATEGORY_COLOURS[q1["category"]]
          and screen["rows"] == 2 and screen["cols"] == 2 and screen["align"] == "center" and screen["livesRight"] <= 2, screen)
    check("testellaris question screen (T4501): only 3 hearts in sight with an accessible name; number and score only numbers with a game icon, centred and bigger than the tier",
          screen["hearts"] == "♥♥♥" and screen["livesVisible"] == "♥♥♥" and screen["icons"] == ["text_icons/text_research.png", "concepts/concept_unity.png"]
          and screen["values"] == ["1", "0"] and screen["bigger"] and screen["centred"] <= 4, screen)
    await pg.keyboard.press(str(first["right"] + 1))
    hud = await pg.evaluate(HUD_JS)
    marks = await pg.evaluate("()=>[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>[b.disabled,b.className])")
    check("testellaris game: the key of the right answer gives 100 points, shows Correct, the explanation and the source, and focuses Next",
          hud["score"] == "Score 100" and hud["feedback"] and "Correct! +100 points." in hud["feedback"] and q1["explanation"]["en"] in hud["feedback"] and source_in(q1, hud["feedback"])
          and hud["announce"].startswith("Correct.") and hud["focus"] == "tq-next" and all(m[0] for m in marks) and "is-correct" in marks[first["right"]][1], (hud, marks))
    src = await pg.evaluate("""()=>{const t=document.querySelector('#tq-feedback-source .tq-source-text'),d=document.querySelector('#tq-feedback-source .tq-source-detail');
      return [t.textContent,d.textContent,parseFloat(getComputedStyle(d).fontSize)<parseFloat(getComputedStyle(t).fontSize),d.getBoundingClientRect().top>=t.getBoundingClientRect().bottom-1]}""")
    check("testellaris game (T4503): the feedback shows the source sentence and, smaller on its own line, the exact file and key (or wiki section)",
          src[:2] == list(source_parts_en(q1)) and src[2] and src[3], src)
    await pg.keyboard.press("Enter")
    second = await pg.evaluate(POSITIONS_JS, small)
    check("testellaris game: Enter goes to the next question, a different one", second["id"] != first["id"] and await pg.evaluate("()=>document.querySelector('#tq-feedback').hidden"), second["id"])
    # a language change keeps the question, its answer order and the score
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate(POSITIONS_JS, small)
    q2 = by_id[second["id"]]
    check("testellaris game: changing the language redraws the same question with the same answer order",
          jp["id"] == second["id"] and jp["texts"] == [q2["answers"]["jp"][q2["answers"]["en"].index(x)] for x in second["texts"]] and await pg.evaluate("()=>document.querySelector('#tq-question').textContent") == q2["text"]["jp"], jp)
    await pg.click(".lang-btn[data-lang=en]")
    await pg.keyboard.press("abcd"[second["wrong"]])
    hud = await pg.evaluate(HUD_JS)
    marks = await pg.evaluate("()=>[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.className)")
    check("testellaris game: a wrong answer (letter key) costs a life and shows the correct answer and the explanation",
          hud["lives"] == "2 lives left" and hud["score"] == "Score 100" and ("The correct answer is: " + q2["answers"]["en"][q2["correct"]]) in hud["feedback"]
          and q2["explanation"]["en"] in hud["feedback"] and "is-wrong" in marks[second["wrong"]] and "is-correct" in marks[second["right"]] and "Lives: 2 of 3" in hud["announce"], (hud, marks))
    recent = await pg.evaluate("()=>JSON.parse(localStorage.getItem('testellaris-recent'))")
    check("testellaris game: the asked questions are remembered for the next games", recent == [first["id"], second["id"]], recent)
    # two more wrong answers end the game
    picks = [(second["id"], second["texts"][second["wrong"]])]
    for _ in range(2):
        await pg.click("#tq-next")
        pos = await pg.evaluate(POSITIONS_JS, small)
        picks.append((pos["id"], pos["texts"][pos["wrong"]]))
        await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["wrong"])
    await pg.click("#tq-next")
    end = await pg.evaluate(END_JS)
    check("testellaris game: the third wrong answer ends the game: end screen with the reason, score, tier, correct answers and no lifelines",
          end["game"] and end["end"] and end["reason"] == "You have no lives left." and end["stats"] == {"Score": "100", "Tier reached": "Tier 1 · Primitive", "Correct answers": "1 of 4", "Lifelines used": "none"}
          and end["focus"] == "tq-end-title", end)
    expected = [[qid, "Category: " + CATEGORY_EN[by_id[qid]["category"]], by_id[qid]["text"]["en"], "Your answer: " + chosen, "Correct answer: " + by_id[qid]["answers"]["en"][by_id[qid]["correct"]], by_id[qid]["explanation"]["en"],
                 source_en(by_id[qid])] for qid, chosen in picks]
    check("testellaris end screen: every failed question with the answer given, the correct one, the explanation and the source", end["failed"] == expected and end["none"], (end["failed"], expected))
    await pg.click(".lang-btn[data-lang=es]")
    es = await pg.evaluate(END_JS)
    check("testellaris end screen: follows the language (es)", es["failed"][0][2] == by_id[picks[0][0]]["text"]["es"] and es["failed"][0][4].startswith("Respuesta correcta: ") and "Puntos" in es["stats"], es)
    await pg.click(".lang-btn[data-lang=en]")
    # Play again, then Give up through the confirmation dialog (Cancel keeps playing)
    await pg.click("#tq-play-again")
    again = await pg.evaluate(POSITIONS_JS, small)
    last_game = await pg.evaluate("()=>JSON.parse(localStorage.getItem('testellaris-recent'))")
    check("testellaris game: Play again starts a new game (question 1) without the questions of the last one",
          len(last_game) == 5 and again["id"] == last_game[-1] and again["id"] not in last_game[:-1] and (await pg.evaluate(HUD_JS))["n"] == "Question 1", (again["id"], last_game))
    await lifeline_checks(pg, small)
    await pg.click("#tq-give-up")
    await pg.click(".confirm-dialog .confirm-btn:not(.is-danger)")
    still = await pg.evaluate("()=>!document.querySelector('#tq-game').hidden&&!document.querySelector('.confirm-overlay')")
    await pg.click("#tq-give-up")
    await pg.click(".confirm-dialog .confirm-btn.is-danger")
    gave = await pg.evaluate("()=>[document.querySelector('#tq-end').hidden,document.querySelector('#tq-end-reason').textContent]")
    check("testellaris game: Give up asks first (Keep playing goes on), then ends the game", still and gave == [False, "You gave up."], (still, gave))
    end = await pg.evaluate(END_JS)
    check("testellaris end screen: a given-up game keeps its score, lists the lifelines used and says no question was failed",
          end["stats"] == {"Score": "150", "Tier reached": "Tier 1 · Primitive", "Correct answers": "2 of 2", "Lifelines used": "World Cracker, Galactic Administration, Deflectors, Enhanced Recycling"}
          and end["failed"] == [] and not end["none"], end)
    await pg.click("#tq-back-start")
    check("testellaris game: Change the DLC filter goes back to the start screen", await pg.evaluate("()=>!document.querySelector('#tq-start').hidden&&document.querySelector('#tq-end').hidden"))


LIFELINES_JS = """()=>({buttons:[...document.querySelectorAll('.tq-lifeline')].map(b=>[b.dataset.lifeline,b.disabled,b.className.replace('tq-lifeline','').trim(),b.querySelector('.tq-lifeline-name').textContent+' '+b.querySelector('.tq-lifeline-hint').textContent,b.dataset.category,b.querySelector('img').getAttribute('src').replace(/^.*?(technologies|traditions)\\//,'$1/'),getComputedStyle(b.querySelector('.tq-lifeline-name')).color]),
  status:document.querySelector('#tq-lifeline-status').textContent,removed:[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.disabled&&b.classList.contains('is-removed')),
  score:(e=>e.querySelector('img').alt+' '+e.querySelector('.tq-hud-value').textContent)(document.querySelector('#tq-hud-score')),lives:document.querySelector('#tq-hud-lives .visually-hidden').textContent,n:(e=>e.querySelector('img').alt+' '+e.querySelector('.tq-hud-value').textContent)(document.querySelector('#tq-hud-number')),
  answered:!document.querySelector('#tq-feedback').hidden,focus:document.activeElement.className})"""


async def lifeline_checks(pg, small):
    """T4203, on question 1 of a fresh game (score 0, 3 lives)."""
    start = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines (T4502): four lifelines with their game names and effects; Enhanced Recycling is off at the start (nothing spent), the other three available",
          [b[0] for b in start["buttons"]] == ["fifty", "skip", "shield", "recycle"] and [b[1] for b in start["buttons"]] == [False, False, False, True]
          and start["buttons"][0][3].startswith("World Cracker 50 %") and start["buttons"][1][3].startswith("Galactic Administration") and start["buttons"][2][3].startswith("Deflectors")
          and start["buttons"][3][3].startswith("Enhanced Recycling Gives back"), start["buttons"])
    check("testellaris lifelines (T4502): each one in its category colour with the icon of its technology or tradition",
          [b[4] for b in start["buttons"]] == ["engineering", "society", "physics", "unity"]
          and [b[5] for b in start["buttons"]] == ["technologies/tech_colossus.png", "technologies/tech_galactic_administration.png", "technologies/tech_shields_1.png", "traditions/tr_adaptability_recycling.png"]
          and [b[6] for b in start["buttons"]] == [CATEGORY_COLOURS[c] for c in ("engineering", "society", "physics", "unity")], start["buttons"])
    await pg.click("#tq-lifeline-fifty")
    s = await pg.evaluate(LIFELINES_JS)
    pos = await pg.evaluate(POSITIONS_JS, small)
    check("testellaris lifelines: World Cracker takes away two wrong answers (never the right one), says so, and locks the other lifelines for this question (Enhanced Recycling stays available)",
          s["removed"].count(True) == 2 and not s["removed"][pos["right"]] and "removed two wrong answers" in s["status"]
          and [b[1] for b in s["buttons"]] == [True, True, True, False] and "used" in s["buttons"][0][3] and "tq-answer" in s["focus"], s)
    await pg.keyboard.press(str(next(i for i, r in enumerate(s["removed"]) if r) + 1))  # a removed answer cannot be picked
    still = await pg.evaluate(LIFELINES_JS)
    await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["right"])
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: a removed answer cannot be picked; the right answer with World Cracker is worth half (50 at tier 1)", not still["answered"] and s["answered"] and s["score"] == "Score 50", (still["answered"], s["score"]))
    await pg.click("#tq-next")
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: on the next question World Cracker stays used and the other three are available",
          [b[1] for b in s["buttons"]] == [True, False, False, False] and "is-used" in s["buttons"][0][2] and s["status"] == "", s["buttons"])
    await pg.click("#tq-lifeline-shield")
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: Deflectors show as active before answering", "is-active" in s["buttons"][2][2] and "active" in s["buttons"][2][3] and "Deflectors up" in s["status"], s)
    pos = await pg.evaluate(POSITIONS_JS, small)
    await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["wrong"])
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: with the shields a wrong answer is crossed out, costs no life and the player picks again",
          not s["answered"] and s["removed"][pos["wrong"]] and s["lives"] == "3 lives left" and "absorbed" in s["status"]
          and "absorbed" in await pg.evaluate("()=>document.querySelector('#tq-announce').textContent"), s)
    await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["right"])
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: then the right answer scores as usual (100 at tier 1)", s["answered"] and s["score"] == "Score 150" and s["lives"] == "3 lives left", s)
    await pg.click("#tq-next")
    before = await pg.evaluate(POSITIONS_JS, small)
    n = (await pg.evaluate(LIFELINES_JS))["n"]
    await pg.click("#tq-lifeline-skip")
    after = await pg.evaluate(POSITIONS_JS, small)
    s = await pg.evaluate(LIFELINES_JS)
    check("testellaris lifelines: Galactic Administration shows another question with the same number and score; the other three are spent, Enhanced Recycling is left",
          after["id"] != before["id"] and s["n"] == n == "Question 3" and s["score"] == "Score 150" and not s["answered"] and [b[1] for b in s["buttons"]] == [True, True, True, False]
          and "Galactic Administration" in s["status"], (before["id"], after["id"], s))
    await pg.click("#tq-lifeline-recycle")
    s = await pg.evaluate(LIFELINES_JS)
    back = next((b[0] for b in s["buttons"][:3] if "is-used" not in b[2]), None)
    check("testellaris lifelines (T4502): Enhanced Recycling gives back one spent lifeline and says which; it cannot be used on this question again (Galactic Administration was), and Recycling itself is spent",
          back in ("fifty", "skip", "shield") and [b[0] for b in s["buttons"] if "is-used" in b[2]] == [x for x in ("fifty", "skip", "shield", "recycle") if x != back]
          and all(b[1] for b in s["buttons"]) and s["status"] == "Enhanced Recycling: %s is back." % {"fifty": "World Cracker", "skip": "Galactic Administration", "shield": "Deflectors"}.get(back), s)
    await pg.click(".lang-btn[data-lang=jp]")
    jp = await pg.evaluate(LIFELINES_JS)
    await pg.click(".lang-btn[data-lang=en]")
    check("testellaris lifelines (T4502): the official names follow the language (jp: 惑星破砕砲, 銀河規模の行政機構, デフレクター, 再利用強化) and so does the message",
          [b[3].split(" ")[0] for b in jp["buttons"]] == ["惑星破砕砲", "銀河規模の行政機構", "デフレクター", "再利用強化"] and jp["status"].startswith("再利用強化："), jp)
