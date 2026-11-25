/**
 * Testellaris game rules without any DOM (TESTELLARIS_GDD.md §3–4), so the page script and the
 * smoke tests share them. The question bank is data/testellaris/<rulesetId>/questions.json.
 *
 * A game is a plain object made by createGame(); the functions below change it in place:
 * nextQuestion() draws the next question, answer() checks the player's pick. Answers are
 * shown in a shuffled order: `current.order[i]` is the bank index of the answer shown i-th.
 */

export const TIERS = [1, 2, 3, 4, 5];
export const MAX_TIER = 5;
export const LIVES = 3;
/** Right answers in the current tier needed to move up one tier (GDD §3.2). */
export const CORRECT_TO_ADVANCE = 5;
/** Ids of the last questions asked, kept between games and avoided while others remain (GDD §3.2). */
export const RECENT_LIMIT = 200;
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

/** Fisher–Yates shuffle of a copy of `items`. */
export function shuffle(items, rng = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * New game over `questions` (already filtered by DLC). `recent` are the ids asked in the last
 * games: they are drawn only when a tier has no other question left.
 */
export function createGame(questions, { recent = [], rng = Math.random } = {}) {
    return {
        rng,
        byTier: Object.fromEntries(TIERS.map((tier) => [tier, questions.filter((q) => q.tier === tier)])),
        recent: new Set(recent),
        asked: new Set(),
        tier: 1,
        maxTier: 1,
        correctInTier: 0,
        lives: LIVES,
        score: 0,
        answered: 0,
        correct: 0,
        number: 0, // questions shown so far (the current one included)
        current: null,
        history: [], // { id, tier, correct, chosen, points } per answered question
        over: false,
        endReason: null, // "lives" | "completed" | "gaveUp"
    };
}

/** Unasked questions of a tier, the ones not asked in recent games first. */
function candidates(game, tier) {
    const unasked = game.byTier[tier].filter((q) => !game.asked.has(q.id));
    const fresh = unasked.filter((q) => !game.recent.has(q.id));
    return fresh.length ? fresh : unasked;
}

function showQuestion(game, question) {
    game.asked.add(question.id);
    game.number += 1;
    game.current = {
        question,
        order: shuffle([0, 1, 2, 3], game.rng),
        removed: new Set(), // shown positions taken away by a lifeline
        answered: false,
    };
    return question;
}

/**
 * Draws the next question: a random unasked one of the current tier; when the tier has run out,
 * the game moves up to the next tier that has questions (GDD §3.2). Returns null and ends the
 * game as completed when no tier from the current one up has any question left.
 */
export function nextQuestion(game) {
    if (game.over) return null;
    for (let tier = game.tier; tier <= MAX_TIER; tier += 1) {
        const pool = candidates(game, tier);
        if (!pool.length) continue;
        if (tier !== game.tier) {
            game.tier = tier;
            game.correctInTier = 0;
        }
        game.maxTier = Math.max(game.maxTier, tier);
        return showQuestion(game, pool[Math.floor(game.rng() * pool.length)]);
    }
    endGame(game, "completed");
    return null;
}

/** Points of a right answer at `tier` (GDD §3.5). */
export function pointsFor(tier) {
    return 100 * tier;
}

/**
 * The player picks the answer shown at `position` (0–3). Returns
 * { correct, points, correctPosition, livesLost } and updates the score, lives and tier.
 */
export function answer(game, position) {
    const current = game.current;
    if (!current || current.answered || game.over) throw new Error("no question to answer");
    const { question } = current;
    const chosen = current.order[position];
    const correct = chosen === question.correct;
    const correctPosition = current.order.indexOf(question.correct);
    current.answered = true;
    current.chosenPosition = position;
    game.answered += 1;
    let points = 0;
    if (correct) {
        points = pointsFor(question.tier);
        game.score += points;
        game.correct += 1;
        game.correctInTier += 1;
    } else {
        game.lives -= 1;
    }
    game.history.push({ id: question.id, tier: question.tier, correct, chosen, points });
    if (game.lives <= 0) endGame(game, "lives");
    else if (correct && game.correctInTier >= CORRECT_TO_ADVANCE && game.tier < MAX_TIER) {
        game.tier += 1;
        game.correctInTier = 0;
    }
    return { correct, points, correctPosition, livesLost: correct ? 0 : 1 };
}

export function endGame(game, reason) {
    if (game.over) return;
    game.over = true;
    game.endReason = reason;
}

/** Ids for the "recently asked" list: the ones of this game after the older ones, the last RECENT_LIMIT. */
export function mergeRecent(recent, game) {
    const ids = [...recent.filter((id) => !game.asked.has(id)), ...game.asked];
    return ids.slice(-RECENT_LIMIT);
}
