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
    await engine_checks(pg)
    await game_checks(pg, {q["id"]: q for q in bank})
    check("testellaris: no page errors", not errors, errors[:3])
    await ctx.close()


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


# Position of the right / a wrong answer of the question on screen, from the bank record.
POSITIONS_JS = """(bank)=>{const id=document.querySelector('#tq-question').dataset.questionId,q=bank[id];const lang=document.documentElement.lang==='ja'?'jp':document.documentElement.lang;
  const texts=[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>b.querySelector('.tq-answer-text').textContent);
  const right=texts.indexOf(q.answers[lang][q.correct]);return {id,right,wrong:texts.findIndex((x,i)=>i!==right&&!document.querySelectorAll('#tq-answers .tq-answer')[i].disabled),texts}}"""
HUD_JS = "()=>({tier:document.querySelector('#tq-hud-tier').textContent,n:document.querySelector('#tq-hud-number').textContent,score:document.querySelector('#tq-hud-score').textContent,lives:document.querySelector('#tq-hud-lives').textContent,feedback:document.querySelector('#tq-feedback').hidden?null:document.querySelector('#tq-feedback').innerText,announce:document.querySelector('#tq-announce').textContent,focus:document.activeElement.id})"


async def game_checks(pg, by_id):
    small = {k: {"answers": v["answers"], "correct": v["correct"]} for k, v in by_id.items()}
    await pg.evaluate("()=>localStorage.removeItem('testellaris-recent')")
    await pg.click("#tq-start-btn")
    first = await pg.evaluate(POSITIONS_JS, small)
    hud = await pg.evaluate(HUD_JS)
    q1 = by_id.get(first["id"])
    if not q1:
        check("testellaris game: Start shows a question", False, (first, hud))
        return
    check("testellaris game: Start shows a tier 1 question with four answers, question 1, score 0 and 3 lives",
          q1["tier"] == 1 and len(first["texts"]) == 4 and sorted(first["texts"]) == sorted(q1["answers"]["en"]) and hud["tier"] == "Tier 1 · Primitive"
          and hud["n"] == "Question 1" and hud["score"] == "Score: 0" and hud["lives"].endswith("Lives: 3 of 3") and hud["feedback"] is None and hud["focus"] == "tq-question", hud)
    await pg.keyboard.press(str(first["right"] + 1))
    hud = await pg.evaluate(HUD_JS)
    marks = await pg.evaluate("()=>[...document.querySelectorAll('#tq-answers .tq-answer')].map(b=>[b.disabled,b.className])")
    check("testellaris game: the key of the right answer gives 100 points, shows Correct, the explanation and the source, and focuses Next",
          hud["score"] == "Score: 100" and hud["feedback"] and "Correct!" in hud["feedback"] and q1["explanation"]["en"] in hud["feedback"] and q1["source"]["key"] in hud["feedback"]
          and hud["announce"].startswith("Correct.") and hud["focus"] == "tq-next" and all(m[0] for m in marks) and "is-correct" in marks[first["right"]][1], (hud, marks))
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
          hud["lives"].endswith("Lives: 2 of 3") and hud["score"] == "Score: 100" and ("The correct answer is: " + q2["answers"]["en"][q2["correct"]]) in hud["feedback"]
          and q2["explanation"]["en"] in hud["feedback"] and "is-wrong" in marks[second["wrong"]] and "is-correct" in marks[second["right"]] and "Lives: 2 of 3" in hud["announce"], (hud, marks))
    recent = await pg.evaluate("()=>JSON.parse(localStorage.getItem('testellaris-recent'))")
    check("testellaris game: the asked questions are remembered for the next games", recent == [first["id"], second["id"]], recent)
    # two more wrong answers end the game
    for _ in range(2):
        await pg.click("#tq-next")
        pos = await pg.evaluate(POSITIONS_JS, small)
        await pg.click("#tq-answers .tq-answer[data-position='%d']" % pos["wrong"])
    await pg.click("#tq-next")
    end = await pg.evaluate("()=>({game:document.querySelector('#tq-game').hidden,end:!document.querySelector('#tq-end').hidden,reason:document.querySelector('#tq-end-reason').textContent,stats:document.querySelector('#tq-end-stats').innerText,focus:document.activeElement.id})")
    check("testellaris game: the third wrong answer ends the game: end screen with the reason, score, tier and correct answers",
          end["game"] and end["end"] and end["reason"] == "You have no lives left." and "100" in end["stats"] and "1 of 4" in end["stats"] and "Tier 1" in end["stats"] and end["focus"] == "tq-end-title", end)
    # Play again, then Give up through the confirmation dialog (Cancel keeps playing)
    await pg.click("#tq-play-again")
    again = await pg.evaluate(POSITIONS_JS, small)
    last_game = await pg.evaluate("()=>JSON.parse(localStorage.getItem('testellaris-recent'))")
    check("testellaris game: Play again starts a new game (question 1) without the questions of the last one",
          len(last_game) == 5 and again["id"] == last_game[-1] and again["id"] not in last_game[:-1] and (await pg.evaluate(HUD_JS))["n"] == "Question 1", (again["id"], last_game))
    await pg.click("#tq-give-up")
    await pg.click(".confirm-dialog .confirm-btn:not(.is-danger)")
    still = await pg.evaluate("()=>!document.querySelector('#tq-game').hidden&&!document.querySelector('.confirm-overlay')")
    await pg.click("#tq-give-up")
    await pg.click(".confirm-dialog .confirm-btn.is-danger")
    gave = await pg.evaluate("()=>[document.querySelector('#tq-end').hidden,document.querySelector('#tq-end-reason').textContent]")
    check("testellaris game: Give up asks first (Keep playing goes on), then ends the game", still and gave == [False, "You gave up."], (still, gave))
    await pg.click("#tq-back-start")
    check("testellaris game: Change the DLC filter goes back to the start screen", await pg.evaluate("()=>!document.querySelector('#tq-start').hidden&&document.querySelector('#tq-end').hidden"))
