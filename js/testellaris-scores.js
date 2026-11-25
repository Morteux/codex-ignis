/**
 * Testellaris top 10 (TESTELLARIS_GDD.md §3.5, §7): the shared hall of fame when it can be
 * reached, else a local top 10 kept in localStorage (T4205). No DOM here.
 *
 * The shared board is a Vercel function (section 43). Until the game is connected to it (T4303),
 * `hallOfFame.client` is null and every call falls back to the local top 10. A client is an
 * object { load(rulesetId) → entries, submit(entry) → entries } whose promises reject when the
 * board cannot be reached; nothing is queued to be sent later (GDD §7.2).
 *
 * Entry: { name, score, maxTier, answered, correct, dlcs (DLCs checked), rulesetId, date (ISO) }.
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

/** Sends an entry to the shared board, or keeps it in the local one when that cannot be reached. */
export async function submitEntry(entry) {
    if (hallOfFame.client) {
        try {
            return { shared: true, entries: sortEntries(await hallOfFame.client.submit(entry)) };
        } catch (error) {
            console.warn("Testellaris: hall of fame not reachable, local top 10", error);
        }
    }
    return { shared: false, entries: saveLocal(entry) };
}
