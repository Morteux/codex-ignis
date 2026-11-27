/**
 * Tests of the hall of fame API (api/hall-of-fame.js, section 43) with the in-memory store, no
 * database or network. Run: node tests/hall-of-fame/api-test.mjs — prints one JSON line
 * [[name, ok, detail], …] that tests/smoke/hall_of_fame_api.py turns into smoke checks.
 */
import { createHandler, readBankInfo, MAX_BODY_BYTES } from "../../api/_lib/board.js";
import { memoryStore } from "../../api/_lib/memory-store.js";

const RULESET = "stellaris-pc-4.5.4";
const results = [];
const check = (name, ok, detail = "") => results.push([name, Boolean(ok), ok ? "" : JSON.stringify(detail)]);

function response() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
        end(text) { this.body = text ? JSON.parse(text) : null; },
    };
}

/** Calls the handler like Vercel does (`req.body` already parsed for a JSON body). */
let ipCount = 0;
async function call(handle, method, { query = {}, body, headers = {}, ip = `203.0.113.${(ipCount += 1) % 250}` } = {}) {
    const res = response();
    const url = "/api/hall-of-fame?" + new URLSearchParams(query);
    await handle({ method, url, query, body, headers: { "x-real-ip": ip, ...headers } }, res);
    return res;
}

let clock = Date.parse("2026-11-25T10:00:00Z");
const now = () => new Date((clock += 1000));
/** A possible entry: right answers per tier, wrong answers, the half lost to Sensor Sweep and the completion bonus. */
function entry(name, byTier, { wrong = 0, half = 0, bonus = 0, ...extra } = {}) {
    const correctByTier = [0, 1, 2, 3, 4].map((i) => byTier[i] || 0);
    const correct = correctByTier.reduce((a, b) => a + b, 0);
    const score = correctByTier.reduce((sum, n, i) => sum + n * 100 * (i + 1), 0) - half + bonus;
    const maxTier = Math.max(1, ...correctByTier.map((n, i) => (n ? i + 1 : 0)));
    return { name, score, maxTier, answered: correct + wrong, correct, correctByTier, dlcs: 26, rulesetId: RULESET, ...extra };
}

// ── T4301: GET / POST, top 10 only, errors ──────────────────────────────────
{
    const store = memoryStore();
    const handle = createHandler({ store, now });
    const bank = readBankInfo(RULESET);
    check("hall of fame API: the bank size of the ruleset is read from its questions.json (5 tiers)", bank && bank.total > 0 && Object.values(bank.byTier).reduce((a, b) => a + b, 0) === bank.total, bank);
    check("hall of fame API: an unknown or path-like ruleset has no bank", readBankInfo("nope-1.0") === null && readBankInfo("../data") === null && readBankInfo("a/b") === null);

    const empty = await call(handle, "GET", { query: { ruleset: RULESET } });
    check("hall of fame API: GET of an empty board answers 200 with no entries and no-store", empty.statusCode === 200 && empty.body.entries.length === 0 && empty.headers["cache-control"] === "no-store", empty);
    const bad = await call(handle, "GET", { query: { ruleset: "../../etc" } });
    check("hall of fame API: GET of an unknown ruleset answers 400 ruleset", bad.statusCode === 400 && bad.body.error === "ruleset", bad);

    const first = await call(handle, "POST", { body: entry("  Ana   B  ", [3]) });
    check("hall of fame API: POST saves the entry (201) with the name normalised and the server date", first.statusCode === 201 && first.body.saved && first.body.entry.name === "Ana B" && first.body.entry.date.startsWith("2026-11-25") && first.body.entries.length === 1, first);

    for (let i = 1; i <= 11; i += 1) await call(handle, "POST", { body: entry("P" + i, [i]) });
    const board = await call(handle, "GET", { query: { ruleset: RULESET } });
    const scores = board.body.entries.map((e) => e.score);
    check("hall of fame API: only the top 10 is kept, best first", store.entries.length === 10 && scores.length === 10 && scores.join() === [...scores].sort((a, b) => b - a).join() && scores.at(-1) >= 200, scores);
    check("hall of fame API: entries carry only the public fields", Object.keys(board.body.entries[0]).sort().join() === "answered,correct,date,dlcs,maxTier,name,rulesetId,score", board.body.entries[0]);

    const low = await call(handle, "POST", { body: entry("Low", [1]) });
    check("hall of fame API: a score below the 10th is not saved (200 saved false) and the board is unchanged", low.statusCode === 200 && low.body.saved === false && store.entries.length === 10 && !store.entries.some((e) => e.name === "Low"), low);

    const tie = await call(handle, "POST", { body: entry("Tie", [0, 0, 1]) });
    check("hall of fame API: a tie with the 10th enters by the tie rules (higher tier, fewer answered)", tie.statusCode === 201 && tie.body.entries.some((e) => e.name === "Tie") && store.entries.length === 10, tie);

    const method = await call(handle, "DELETE");
    check("hall of fame API: other methods answer 405 with Allow: GET, POST", method.statusCode === 405 && method.headers.allow === "GET, POST", method);
    const json = await call(handle, "POST", { body: "{not json" });
    check("hall of fame API: a body that is not a JSON object answers 400 json", json.statusCode === 400 && json.body.error === "json", json);
    const big = await call(handle, "POST", { body: entry("Big", [1]), headers: { "content-length": String(MAX_BODY_BYTES + 1) } });
    check("hall of fame API: a body over 1 KB answers 413", big.statusCode === 413 && big.body.error === "size", big);
    const wrongRuleset = await call(handle, "POST", { body: entry("X", [1], { rulesetId: "other-1.0" }) });
    check("hall of fame API: a POST for a ruleset without bank answers 400 ruleset", wrongRuleset.statusCode === 400 && wrongRuleset.body.error === "ruleset", wrongRuleset);
    const badName = await call(handle, "POST", { body: entry("waytoolongname", [1]) });
    check("hall of fame API: a name the game would reject answers 400 name", badName.statusCode === 400 && badName.body.error === "name", badName);

    const other = await call(handle, "GET", { query: { ruleset: RULESET } });
    check("hall of fame API: rejected requests leave the board as it was", other.body.entries.length === 10, other);
}
{
    const none = await call(createHandler({ store: async () => null }), "GET", { query: { ruleset: RULESET } });
    check("hall of fame API: without MONGODB_URI (no store) it answers 503 unavailable", none.statusCode === 503 && none.body.error === "unavailable", none);
    const broken = { top: async () => { throw new Error("down"); } };
    const errors = console.error;
    console.error = () => {};
    const down = await call(createHandler({ store: broken }), "GET", { query: { ruleset: RULESET } });
    console.error = errors;
    check("hall of fame API: a database error answers 503 unavailable without details", down.statusCode === 503 && down.body.error === "unavailable" && !JSON.stringify(down.body).includes("down"), down);
    const { mongoStore } = await import("../../api/_lib/mongo-store.js");
    check("hall of fame API: the MongoDB store is not opened without MONGODB_URI", (await mongoStore({})) === null);
}

// ── T4302: payload, names, plausible score, rate limit ─────────────────────
{
    const { validateEntry, possibleScores } = await import("../../api/_lib/entry-rules.js");
    const { isBlockedName, fold } = await import("../../api/_lib/blocked-words.js");
    const bank = readBankInfo(RULESET);
    const verdict = (body) => validateEntry(body, { bankInfo: readBankInfo }).error || "ok";
    const good = entry("Ana", [5, 5, 2]);

    check("hall of fame rules: a possible entry is accepted", verdict(good) === "ok", verdict(good));
    check("hall of fame rules: unknown fields are rejected (the date is the server's)", verdict({ ...good, date: "1999-01-01T00:00:00Z" }) === "fields" && verdict({ ...good, admin: true }) === "fields");
    const { dlcs, ...missing } = good;
    check("hall of fame rules: a missing field is rejected", verdict(missing) === "fields");
    check("hall of fame rules: wrong types are rejected (string score, fraction, negative, 4 tiers, long raw name)",
        ["fields", "fields", "fields", "fields", "fields"].join() === [verdict({ ...good, score: "1200" }), verdict({ ...good, answered: 12.5 }), verdict({ ...good, dlcs: -1 }), verdict({ ...good, correctByTier: [5, 5, 2, 0] }), verdict({ ...good, name: "a".repeat(65) })].join());

    const names = ["", "   ", "abcdefghijk", "Ana😀", "a​b", "fuck", "FuCk3r", "f u c k", "fu_ck", "ｆｕｃｋ", "fuсk", "sh1t", "PUTA", "Marícón", "クソ", "くそ", "ちんこ", "チンコ", "殺す"];
    const rejected = names.filter((name) => verdict({ ...good, name }) === "name");
    check("hall of fame rules: names breaking §7.1 or the word filter are rejected with the generic code name (spaces, case, accents, full width, look-alikes, leetspeak, katakana)", rejected.length === names.length, names.filter((n) => !rejected.includes(n)));
    const fine = ["Ana", "Yamashita", "Dickens", "icono", "Peacock", "宇宙の帝王", "Ñandú-7", "Zoë_B.", "ばかんす"];
    const accepted = fine.filter((name) => verdict({ ...good, name }) === "ok");
    check("hall of fame rules: ordinary names that contain a word of the alone list are accepted", accepted.length === fine.length, fine.filter((n) => !accepted.includes(n)));
    check("hall of fame rules: folding removes accents, spaces, look-alikes and the kana form", fold("Ｍa-rí cón") === "maricon" && fold("р0rn") === "porn" && fold("カタカナ") === "かたかな" && isBlockedName("a.s.s.h.o.l.e"));

    const score = (body) => verdict(body) === "score";
    check("hall of fame rules: a score above the counts is rejected", score({ ...good, score: good.score + 50 }) && score({ ...good, score: good.score + 100000 }));
    check("hall of fame rules: World Cracker halves one right answer, or two after Enhanced Recycling (T4502); three halves or a half of a tier without right answers are rejected",
        verdict(entry("Ana", [5, 5, 2], { half: 150 })) === "ok" && verdict(entry("Ana", [5, 5, 2], { half: 50 })) === "ok" && verdict(entry("Ana", [5, 5, 2], { half: 200 })) === "ok"
        && verdict(entry("Ana", [5, 5, 2], { half: 300 })) === "ok" && score(entry("Ana", [5, 5, 2], { half: 350 })) && score(entry("Ana", [5, 5], { half: 250 }))
        && score(entry("Ana", [5, 5, 1], { half: 300 })) && score(entry("Ana", [5, 5], { half: 75 })));
    check("hall of fame rules: counts that no game can reach are rejected (more right than answered, 4 wrong, right answers above the tier reached, more than the bank)",
        score({ ...good, correct: 13 }) && score(entry("Ana", [5, 5, 2], { wrong: 4 })) && score({ ...good, maxTier: 2 }) && score({ ...good, maxTier: 6 }) && score({ ...entry("Ana", [bank.byTier[1] + 1]) }) && score({ ...good, answered: bank.total + 1, correct: bank.total + 1 }));
    check("hall of fame rules: the completion bonus needs every base-game question answered and 250 per life left",
        score(entry("Ana", [5, 5, 2], { bonus: 750 })) && possibleScores(entry("x", [bank.baseTotal]), bank).has(100 * bank.baseTotal + 750)
        && possibleScores(entry("x", [bank.baseTotal - 1], { wrong: 1 }), bank).has(100 * (bank.baseTotal - 1) + 500)
        && !possibleScores(entry("x", [bank.baseTotal - 1], { wrong: 1 }), bank).has(100 * (bank.baseTotal - 1) + 750)
        && !possibleScores(entry("x", [bank.baseTotal - 3], { wrong: 3 }), bank).has(100 * (bank.baseTotal - 3) + 250), bank.baseTotal);
    // T4502: Galactic Administration twice (given back by Enhanced Recycling) leaves two base questions unanswered, never three,
    // and then World Cracker could only have been used once
    const twoSkips = entry("x", [bank.baseTotal - 2]);
    check("hall of fame rules: the completion bonus allows two skipped questions (Enhanced Recycling), not three, and two skips go with one half at most",
        possibleScores(twoSkips, bank).has(100 * (bank.baseTotal - 2) + 750) && possibleScores(twoSkips, bank).has(100 * (bank.baseTotal - 2) - 50 + 750)
        && !possibleScores(twoSkips, bank).has(100 * (bank.baseTotal - 2) - 100 + 750) && possibleScores(twoSkips, bank).has(100 * (bank.baseTotal - 2) - 100)
        && !possibleScores(entry("x", [bank.baseTotal - 3]), bank).has(100 * (bank.baseTotal - 3) + 750), bank.baseTotal);

    const store = memoryStore();
    const handle = createHandler({ store, now, salt: "test-salt" });
    const codes = [];
    for (let i = 0; i < 6; i += 1) codes.push((await call(handle, "POST", { body: entry("R" + i, [1 + i]), ip: "198.51.100.9" })).statusCode);
    const other = await call(handle, "POST", { body: entry("Other", [1]), ip: "198.51.100.10" });
    check("hall of fame rate limit: the 6th POST of one address in 10 minutes answers 429 rate with Retry-After; another address can still post",
        codes.slice(0, 5).every((c) => c === 201) && codes[5] === 429 && other.statusCode === 201, codes);
    const invalid = createHandler({ store: memoryStore(), now, salt: "s" });
    const bad = [];
    for (let i = 0; i < 6; i += 1) bad.push((await call(invalid, "POST", { body: { junk: i }, ip: "198.51.100.11" })).statusCode);
    check("hall of fame rate limit: rejected POSTs count too (no brute-forcing the word filter)", bad.join() === "400,400,400,400,400,429", bad);
    clock += 10 * 60 * 1000 + 1;
    const later = await call(handle, "POST", { body: entry("Later", [9]), ip: "198.51.100.9" });
    check("hall of fame rate limit: the address can post again after 10 minutes", later.statusCode === 201, later);
    const gets = [];
    for (let i = 0; i < 8; i += 1) gets.push((await call(handle, "GET", { query: { ruleset: RULESET }, ip: "198.51.100.9" })).statusCode);
    check("hall of fame rate limit: GET is not limited", gets.every((c) => c === 200), gets);
    const keys = new Set(store.hits.map((h) => h.key));
    check("hall of fame rate limit: only a salted SHA-256 of the address is kept, never the address", [...keys].every((k) => /^[0-9a-f]{64}$/.test(k)) && !JSON.stringify(store).includes("198.51.100") && keys.size === 2, [...keys]);
    const { clientKey } = await import("../../api/_lib/board.js");
    const req = { headers: { "x-forwarded-for": "192.0.2.1, 10.0.0.1" } };
    check("hall of fame rate limit: the hash depends on the salt and on the first forwarded address", clientKey(req, "a") !== clientKey(req, "b") && clientKey(req, "a") === clientKey({ headers: { "x-real-ip": "192.0.2.1" } }, "a"));
}

// ── T4303: the game's client (js/testellaris-scores.js) against this handler ──
{
    const S = await import("../../js/testellaris-scores.js");
    const handle = createHandler({ store: memoryStore(), now, salt: "s" });
    const fetchImpl = async (url, init) => {
        const parsed = new URL(url, "http://localhost");
        const res = await call(handle, init.method, { query: Object.fromEntries(parsed.searchParams), body: init.body });
        return new Response(JSON.stringify(res.body), { status: res.statusCode });
    };
    const client = S.apiClient({ fetchImpl });
    const local = { ...entry("Ignis", [5, 3]), date: "2026-11-25T09:00:00.000Z" };
    const sent = await client.submit(local);
    const loaded = await client.load(RULESET);
    let refused = null;
    try { await client.submit({ ...local, name: "fuck" }); } catch (error) { refused = error instanceof S.HallOfFameRejected && error.code; }
    check("hall of fame API + game client: the game's entry is accepted as sent (date replaced by the server's), listed by GET, and a refused name raises HallOfFameRejected",
        sent.saved && sent.entry.name === "Ignis" && sent.entry.date !== local.date && loaded.length === 1 && loaded[0].score === 1100 && refused === "name", { sent, loaded, refused });
}

console.log(JSON.stringify(results));
