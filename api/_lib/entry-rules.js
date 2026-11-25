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

/**
 * Every score a game with these counts can end with (GDD §3.5): the points of the right answers
 * of each tier, less half of one of them when Sensor Sweep was used on a right answer, plus the
 * completion bonus (250 per life left) only when the game answered every base-game question
 * (the DLC filter never removes those, so no game completes with fewer; one may be skipped).
 */
export function possibleScores({ maxTier, answered, correct, correctByTier }, bank) {
    const base = TIERS.reduce((sum, tier) => sum + correctByTier[tier - 1] * pointsFor(tier), 0);
    const halves = [0, ...TIERS.filter((tier) => correctByTier[tier - 1] > 0).map((tier) => pointsFor(tier) - pointsFor(tier, true))];
    const livesLeft = LIVES - (answered - correct);
    const bonuses = [0];
    if (livesLeft > 0 && answered + 1 >= bank.baseTotal) bonuses.push(COMPLETION_BONUS_PER_LIFE * livesLeft);
    return new Set(halves.flatMap((half) => bonuses.map((bonus) => base - half + bonus)));
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
