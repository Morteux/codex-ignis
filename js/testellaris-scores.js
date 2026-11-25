/**
 * Testellaris top 10 (TESTELLARIS_GDD.md §3.5, §7): the shared hall of fame when it can be
 * reached, else a local top 10 kept in localStorage (T4205). No DOM here.
 *
 * The shared board is the Vercel function api/hall-of-fame.js (section 43); `apiClient()` talks
 * to it and the page sets it as `hallOfFame.client` when served over http(s) (T4303). While
 * `hallOfFame.client` is null (file://) every call uses the local top 10. A client is an object
 * { load(rulesetId) → entries, submit(entry) → entries or { entries, entry, saved } } whose
 * promises reject when the board cannot be reached (then the local top 10 is used; nothing is
 * queued to be sent later, GDD §7.2), or reject with a HallOfFameRejected when the board refuses
 * the name (the player can change it).
 *
 * Entry: { name, score, maxTier, answered, correct, correctByTier (right answers of tiers 1–5),
 * dlcs (DLCs checked), rulesetId, date (ISO) }.
 */

export const TOP_SIZE = 10;
export const NAME_MAX = 10;
/** localStorage key of the local boards, one per ruleset: { <rulesetId>: [entries] }. */
export const LOCAL_STORAGE_KEY = "testellaris-top10";

export const hallOfFame = { client: null };

/**
 * Order of the board (GDD §3.5): higher score, then higher tier reached, then fewer questions
 * answered, then the earlier date.
 */
export function compareEntries(a, b) {
    return b.score - a.score || b.maxTier - a.maxTier || a.answered - b.answered || String(a.date).localeCompare(String(b.date));
}

export function sortEntries(entries) {
    return [...entries].sort(compareEntries).slice(0, TOP_SIZE);
}

/** A score enters the board when it is above 0 and the board has room or it beats the 10th entry. */
export function qualifies(entries, entry) {
    if (!(entry.score > 0)) return false;
    const board = sortEntries(entries);
    return board.length < TOP_SIZE || compareEntries(entry, board[TOP_SIZE - 1]) < 0;
}

// ── Names (GDD §7.1) ────────────────────────────────────────────────────────

/** Trimmed, NFC-normalised, inner spaces collapsed. */
export function normalizeName(raw) {
    return String(raw ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

/** Length in user-perceived characters, so 10 Japanese characters count as 10 like 10 Latin ones. */
export function nameLength(name) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name)].length;
    return [...name].length;
}

/** Letters and digits of any script (with their combining marks), space, "-", "_" and ".": no emoji, no control or invisible characters. */
const NAME_PATTERN = /^[\p{L}\p{N}\p{M} ._-]+$/u;

/** null when the name is valid, else "empty", "long" or "chars". */
export function nameError(raw) {
    const name = normalizeName(raw);
    if (!name) return "empty";
    if (nameLength(name) > NAME_MAX) return "long";
    if (!NAME_PATTERN.test(name)) return "chars";
    return null;
}

/** Whether two entries are the same score (the shared board returns copies). */
export function sameEntry(a, b) {
    return Boolean(a && b) && a.name === b.name && a.score === b.score && a.date === b.date;
}

// ── Local top 10 ────────────────────────────────────────────────────────────

function readAll() {
    try {
        const value = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
        return {}; // unavailable or damaged: an empty board
    }
}

function isEntry(entry) {
    return entry && typeof entry.name === "string" && Number.isFinite(entry.score) && Number.isFinite(entry.maxTier) && Number.isFinite(entry.answered);
}

export function loadLocal(rulesetId) {
    const list = readAll()[rulesetId];
    return Array.isArray(list) ? sortEntries(list.filter(isEntry)) : [];
}

/** Adds an entry to the local board of its ruleset and returns the new board (top 10 only). */
export function saveLocal(entry) {
    const all = readAll();
    const board = sortEntries([...loadLocal(entry.rulesetId), entry]);
    all[entry.rulesetId] = board;
    try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
        // Not persisted (private mode, quota): the board lasts for this visit only.
    }
    return board;
}

// ── Board: shared when reachable, local otherwise ───────────────────────────

/** Returns { shared, entries }: `shared` is false when the local top 10 is used. */
export async function loadBoard(rulesetId) {
    if (hallOfFame.client) {
        try {
            return { shared: true, entries: sortEntries(await hallOfFame.client.load(rulesetId)) };
        } catch (error) {
            console.warn("Testellaris: hall of fame not reachable, local top 10", error);
        }
    }
    return { shared: false, entries: loadLocal(rulesetId) };
}

/**
 * Sends an entry to the shared board, or keeps it in the local one when that cannot be reached.
 * Returns { shared, entries, entry (as saved: the shared board sets the date), saved (false when
 * the score no longer enters the shared top 10) }, or { shared: true, rejected: "name" } when the
 * shared board refuses the name.
 */
export async function submitEntry(entry) {
    if (hallOfFame.client) {
        try {
            const result = await hallOfFame.client.submit(entry);
            const sent = Array.isArray(result) ? { entries: result } : result;
            return { shared: true, entries: sortEntries(sent.entries), entry: sent.entry || entry, saved: sent.saved !== false };
        } catch (error) {
            if (error instanceof HallOfFameRejected) return { shared: true, rejected: error.code };
            console.warn("Testellaris: hall of fame not reachable, local top 10", error);
        }
    }
    return { shared: false, entries: saveLocal(entry), entry, saved: true };
}

// ── Client of the shared board (api/hall-of-fame.js) ────────────────────────

export const API_URL = "/api/hall-of-fame";
/** Fields the API accepts, exactly (it sets the date itself and rejects any other field). */
export const SUBMIT_FIELDS = ["name", "score", "maxTier", "answered", "correct", "correctByTier", "dlcs", "rulesetId"];
/** A request that takes longer counts as "cannot be reached". */
export const API_TIMEOUT_MS = 8000;

/** The shared board refused the entry for a reason the player can fix (`code`: "name"). */
export class HallOfFameRejected extends Error {
    constructor(code) {
        super(`hall of fame rejected: ${code}`);
        this.code = code;
    }
}

/** Client of the shared board; `fetchImpl` lets the tests answer without a server. */
export function apiClient({ url = API_URL, fetchImpl = (...args) => fetch(...args), timeoutMs = API_TIMEOUT_MS } = {}) {
    async function request(target, init) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(target, { ...init, signal: controller.signal, headers: { Accept: "application/json", ...init.headers } });
            const body = await response.json().catch(() => null);
            return { status: response.status, ok: response.ok, body };
        } finally {
            clearTimeout(timer);
        }
    }
    const entriesOf = (reply, what) => {
        if (!reply.ok || !Array.isArray(reply.body?.entries)) throw new Error(`hall of fame ${what}: ${reply.status}`);
        return reply.body.entries.filter(isEntry);
    };
    return {
        async load(rulesetId) {
            return entriesOf(await request(`${url}?ruleset=${encodeURIComponent(rulesetId)}`, { method: "GET" }), "GET");
        },
        async submit(entry) {
            const body = JSON.stringify(Object.fromEntries(SUBMIT_FIELDS.map((field) => [field, entry[field]])));
            const reply = await request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
            if (reply.status === 400 && reply.body?.error === "name") throw new HallOfFameRejected("name");
            const entries = entriesOf(reply, "POST");
            return { entries, entry: isEntry(reply.body.entry) ? reply.body.entry : null, saved: reply.body.saved !== false };
        },
    };
}
