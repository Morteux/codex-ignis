/**
 * Checks the body of a hall of fame POST (TESTELLARIS_GDD.md §7.1, §7.3) and returns
 * { entry } with the fields the server keeps, or { error: <code> }:
 *
 * - "fields": a field is missing, unknown or of the wrong type (payload validation).
 * - "ruleset": the ruleset has no question bank.
 * - "name": the name breaks the rules of §7.1 or the word filter (one generic code, so the
 *   player is not told which word was found).
 * - "score": the counts or the score are not possible in a game of that bank.
 *
 * Body: { name, score, maxTier, answered, correct, correctByTier: [tier 1 … tier 5], dlcs, rulesetId }.
 */
import { normalizeName, nameError } from "../../js/testellaris-scores.js";
import { LIVES, MAX_TIER, TIERS, pointsFor, COMPLETION_BONUS_PER_LIFE } from "../../js/testellaris-engine.js";
import { isBlockedName } from "./blocked-words.js";

export const ENTRY_FIELDS = ["name", "score", "maxTier", "answered", "correct", "correctByTier", "dlcs", "rulesetId"];
/** Longest raw name accepted before normalising (the normalised one has at most 10 characters). */
export const RAW_NAME_MAX = 64;
/** Sanity bound of the DLCs checked (26 in 4.5.4); not a game figure. */
export const DLCS_MAX = 64;

const isCount = (value) => Number.isInteger(value) && value >= 0;

/** Whether the payload has exactly the fields of an entry, each of the right type. */
function wellFormed(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return false;
    const keys = Object.keys(body);
    if (keys.length !== ENTRY_FIELDS.length || !ENTRY_FIELDS.every((field) => Object.hasOwn(body, field))) return false;
    return typeof body.name === "string" && body.name.length <= RAW_NAME_MAX
        && typeof body.rulesetId === "string"
        && ["score", "maxTier", "answered", "correct", "dlcs"].every((field) => isCount(body[field]))
        && Array.isArray(body.correctByTier) && body.correctByTier.length === MAX_TIER && body.correctByTier.every(isCount);
}

/** Points lost to `count` World Cracker halves (0, 1 or 2) on right answers: every sum the counts allow. */
function halfLosses(correctByTier, count) {
    const half = (tier) => pointsFor(tier) - pointsFor(tier, true);
    const tiers = TIERS.filter((tier) => correctByTier[tier - 1] > 0);
    if (count === 0) return [0];
    if (count === 1) return tiers.map(half);
    return tiers.flatMap((a) => tiers.filter((b) => b > a || (b === a && correctByTier[a - 1] > 1)).map((b) => half(a) + half(b)));
}

/**
 * Every score a game with these counts can end with (GDD §3.5): the points of the right answers
 * of each tier, less half of the ones World Cracker was used on, plus the completion bonus (250 per
 * life left) only when the game answered every base-game question (the DLC filter never removes
 * those, so no game completes with fewer) but the skipped ones. Each lifeline is used once, and
 * Enhanced Recycling (T4502) can give one back: so up to two halves and one skip, or one half and
 * up to two skips.
 */
export function possibleScores({ maxTier, answered, correct, correctByTier }, bank) {
    const base = TIERS.reduce((sum, tier) => sum + correctByTier[tier - 1] * pointsFor(tier), 0);
    const livesLeft = LIVES - (answered - correct);
    const scores = new Set();
    for (const [halves, skips] of [[0, 2], [1, 2], [2, 1]]) {
        const bonuses = [0];
        if (livesLeft > 0 && answered + skips >= bank.baseTotal) bonuses.push(COMPLETION_BONUS_PER_LIFE * livesLeft);
        for (let count = 0; count <= halves; count += 1) {
            for (const loss of halfLosses(correctByTier, count)) bonuses.forEach((bonus) => scores.add(base - loss + bonus));
        }
    }
    return scores;
}

/** null when the counts fit a game of the bank, else "score". */
function countsError({ maxTier, answered, correct, correctByTier, dlcs }, bank) {
    if (maxTier < 1 || maxTier > MAX_TIER || dlcs > DLCS_MAX) return "score";
    if (correct > answered || answered - correct > LIVES || answered > bank.total) return "score";
    if (correctByTier.reduce((a, b) => a + b, 0) !== correct) return "score";
    // no right answer above the tier reached, nor more right answers in a tier than its questions
    if (TIERS.some((tier) => (tier > maxTier && correctByTier[tier - 1] > 0) || correctByTier[tier - 1] > bank.byTier[tier])) return "score";
    return null;
}

export function validateEntry(body, { bankInfo }) {
    if (!wellFormed(body)) return { error: "fields" };
    const bank = bankInfo(body.rulesetId);
    if (!bank) return { error: "ruleset" };
    if (nameError(body.name) || isBlockedName(normalizeName(body.name))) return { error: "name" };
    if (countsError(body, bank) || !possibleScores(body, bank).has(body.score)) return { error: "score" };
    const { score, maxTier, answered, correct, correctByTier, dlcs, rulesetId } = body;
    return { entry: { name: normalizeName(body.name), score, maxTier, answered, correct, correctByTier: [...correctByTier], dlcs, rulesetId } };
}
