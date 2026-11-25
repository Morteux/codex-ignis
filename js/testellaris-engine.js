/**
 * Testellaris game rules without any DOM (TESTELLARIS_GDD.md §3–4), so the page script and the
 * smoke tests share them. The question bank is data/testellaris/<rulesetId>/questions.json.
 */

export const TIERS = [1, 2, 3, 4, 5];
/** Fewer questions than this in a tier after the DLC filter: the start screen warns (GDD §4). */
export const FEW_QUESTIONS = 20;

/** A question passes the DLC filter when every DLC of its `dlc` list is checked (GDD §4). */
export function passesFilter(question, checkedDlcs) {
    return question.dlc.every((name) => checkedDlcs.has(name));
}

export function filterBank(questions, checkedDlcs) {
    return questions.filter((question) => passesFilter(question, checkedDlcs));
}

/** Number of questions per tier, as { 1: n, …, 5: n }. */
export function tierCounts(questions) {
    const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0]));
    for (const question of questions) counts[question.tier] += 1;
    return counts;
}
