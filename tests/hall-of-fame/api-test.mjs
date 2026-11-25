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
async function call(handle, method, { query = {}, body, headers = {} } = {}) {
    const res = response();
    const url = "/api/hall-of-fame?" + new URLSearchParams(query);
    await handle({ method, url, query, body, headers: { "x-real-ip": "203.0.113.7", ...headers } }, res);
    return res;
}

let clock = Date.parse("2026-11-25T10:00:00Z");
const now = () => new Date((clock += 1000));
const entry = (name, score, extra = {}) => ({ name, score, maxTier: 1, answered: 3, correct: 3, dlcs: 26, rulesetId: RULESET, ...extra });

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

    const first = await call(handle, "POST", { body: entry("  Ana   B  ", 300, { date: "1999-01-01T00:00:00Z" }) });
    check("hall of fame API: POST saves the entry (201) with the name normalised and the server date", first.statusCode === 201 && first.body.saved && first.body.entry.name === "Ana B" && first.body.entry.date.startsWith("2026-11-25") && first.body.entries.length === 1, first);

    for (let i = 1; i <= 11; i += 1) await call(handle, "POST", { body: entry("P" + i, 100 * i, { maxTier: Math.min(5, 1 + Math.floor(i / 3)), answered: 3 * i, correct: 3 * i }) });
    const board = await call(handle, "GET", { query: { ruleset: RULESET } });
    const scores = board.body.entries.map((e) => e.score);
    check("hall of fame API: only the top 10 is kept, best first", store.entries.length === 10 && scores.length === 10 && scores.join() === [...scores].sort((a, b) => b - a).join() && scores.at(-1) >= 200, scores);
    check("hall of fame API: entries carry only the public fields", Object.keys(board.body.entries[0]).sort().join() === "answered,correct,date,dlcs,maxTier,name,rulesetId,score", board.body.entries[0]);

    const low = await call(handle, "POST", { body: entry("Low", 100) });
    check("hall of fame API: a score below the 10th is not saved (200 saved false) and the board is unchanged", low.statusCode === 200 && low.body.saved === false && store.entries.length === 10 && !store.entries.some((e) => e.name === "Low"), low);

    const tie = await call(handle, "POST", { body: entry("Tie", scores.at(-1), { maxTier: 5, answered: 1, correct: 1 }) });
    check("hall of fame API: a tie with the 10th enters by the tie rules (higher tier, fewer answered)", tie.statusCode === 201 && tie.body.entries.some((e) => e.name === "Tie") && store.entries.length === 10, tie);

    const method = await call(handle, "DELETE");
    check("hall of fame API: other methods answer 405 with Allow: GET, POST", method.statusCode === 405 && method.headers.allow === "GET, POST", method);
    const json = await call(handle, "POST", { body: "{not json" });
    check("hall of fame API: a body that is not a JSON object answers 400 json", json.statusCode === 400 && json.body.error === "json", json);
    const big = await call(handle, "POST", { body: entry("Big", 100), headers: { "content-length": String(MAX_BODY_BYTES + 1) } });
    check("hall of fame API: a body over 1 KB answers 413", big.statusCode === 413 && big.body.error === "size", big);
    const wrongRuleset = await call(handle, "POST", { body: entry("X", 100, { rulesetId: "other-1.0" }) });
    check("hall of fame API: a POST for a ruleset without bank answers 400 ruleset", wrongRuleset.statusCode === 400 && wrongRuleset.body.error === "ruleset", wrongRuleset);
    const badName = await call(handle, "POST", { body: entry("waytoolongname", 100) });
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

console.log(JSON.stringify(results));
