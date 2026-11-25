/**
 * Checks the body of a hall of fame POST (TESTELLARIS_GDD.md §7.1) and returns
 * { entry } with the fields the server keeps, or { error: <code> }.
 */
import { normalizeName, nameError } from "../../js/testellaris-scores.js";

const isCount = (value) => Number.isInteger(value) && value >= 0;

export function validateEntry(body, { bankInfo }) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "json" };
    if (typeof body.rulesetId !== "string" || !bankInfo(body.rulesetId)) return { error: "ruleset" };
    if (typeof body.name !== "string" || nameError(body.name)) return { error: "name" };
    const counts = ["score", "maxTier", "answered", "correct", "dlcs"];
    if (!counts.every((field) => isCount(body[field]))) return { error: "fields" };
    const { score, maxTier, answered, correct, dlcs, rulesetId } = body;
    return { entry: { name: normalizeName(body.name), score, maxTier, answered, correct, dlcs, rulesetId } };
}
