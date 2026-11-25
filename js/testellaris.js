/**
 * Testellaris (testellaris.html), the Stellaris quiz: page script (TESTELLARIS_GDD.md §8).
 *
 * Loads the question bank of the ruleset (data/testellaris/<rulesetId>/questions.json) and
 * drives the screens: start (rules and DLC filter), question (one at a time, with the result
 * and the explanation after each answer) and end. The rules without DOM live in
 * js/testellaris-engine.js. The language and the static markup are handled by the shared
 * shell (js/page-shell.js); this module repaints its dynamic parts on a language change.
 */

import { t, htmlLangCode } from "./i18n.js";
import "./i18n-testellaris.js";
import { getLang, applyPageTranslations, onLanguageChange } from "./page-shell.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { DLC_BINGO } from "./bingo-game-items.js";
import { confirmChoice } from "./confirm-dialog.js";
import { loadBoard, submitEntry, qualifies, normalizeName, nameLength, nameError, sameEntry, NAME_MAX, hallOfFame, apiClient } from "./testellaris-scores.js";
import {
    TIERS, FEW_QUESTIONS, LIVES, LIFELINES, filterBank, tierCounts, createGame, nextQuestion, answer, endGame, mergeRecent,
    canUseLifeline, useFifty, useSkip, useShield, summary, COMPLETION_BONUS_PER_LIFE,
} from "./testellaris-engine.js";

export const RULESET_ID = "stellaris-pc-4.5.4";
const BANK_URL = `data/testellaris/${RULESET_ID}/questions.json`;
/** Unchecked DLC names (so a DLC added later starts checked), GDD §4. */
const DLC_STORAGE_KEY = "testellaris-dlc-off";
/** Ids of the questions asked in the last games (GDD §3.2). */
const RECENT_STORAGE_KEY = "testellaris-recent";
const ANSWER_KEYS = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };

/** DLCs of the filter: the gameplay ones installed with the game (the portrait packs change no question). */
const DLC_GROUPS = [
    { tag: "expansion", titleKey: "tqDlcExpansion" },
    { tag: "story_pack", titleKey: "tqDlcStoryPack" },
    { tag: "species_pack", titleKey: "tqDlcSpeciesPack" },
].map((group) => ({ ...group, items: DLC_BINGO.filter((item) => item.tags.includes(group.tag)) }));

const el = (id) => document.getElementById(id);
const dlcGroups = el("tq-dlc-groups");
const availableEl = el("tq-available");
const fewEl = el("tq-few");
const startButton = el("tq-start-btn");
const screens = { start: el("tq-start"), game: el("tq-game"), end: el("tq-end") };
const questionEl = el("tq-question");
const iconEl = el("tq-question-icon");
const answersEl = el("tq-answers");
const feedbackEl = el("tq-feedback");
const announceEl = el("tq-announce");

let lang = getLang();
let bank = null; // { rulesetId, questions } once loaded
let questionsById = new Map();
let loadFailed = false;
let game = null; // the game in play or just ended (js/testellaris-engine.js)
let lastResult = null; // result of the answer shown in the feedback, null while answering
let board = null; // { shared, entries } of the top 10 shown, null while loading
let lifelineStatus = null;
/** Top 10 state of the ended game: the name form is offered once; `saved` is the i18n key of the saved message. */
let endState = { offer: false, saved: null, error: null }; // i18n key of the last lifeline message of the current question

/** Replaces {name} placeholders of an interface text. */
export function format(text, values) {
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
}

function readStorage(key, fallback) {
    try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        return fallback; // localStorage unavailable or damaged: defaults
    }
}

function writeStorage(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Not persisted (private mode, quota): the choice lasts for this visit only.
    }
}

// ── Start screen: DLC filter ────────────────────────────────────────────────

function dlcBoxes() {
    return [...dlcGroups.querySelectorAll("input[type=checkbox]")];
}

export function checkedDlcs() {
    return new Set(dlcBoxes().filter((box) => box.checked).map((box) => box.value));
}

function buildDlcFilter() {
    const off = new Set(readStorage(DLC_STORAGE_KEY, []));
    dlcGroups.replaceChildren(...DLC_GROUPS.map((group) => {
        const wrap = document.createElement("div");
        wrap.className = "tq-dlc-group";
        wrap.setAttribute("role", "group");
        const title = document.createElement("h3");
        title.className = "tq-dlc-group-title";
        title.id = `tq-dlc-${group.tag}`;
        title.dataset.i18n = group.titleKey;
        title.textContent = t(lang, group.titleKey);
        wrap.setAttribute("aria-labelledby", title.id);
        const list = document.createElement("div");
        list.className = "tq-dlc-list";
        for (const item of group.items) {
            const label = document.createElement("label");
            label.className = "tq-dlc-item";
            const box = document.createElement("input");
            box.type = "checkbox";
            box.value = item.dlc;
            box.checked = !off.has(item.dlc);
            label.append(box);
            if (item.img) {
                const img = document.createElement("img");
                img.src = IMAGE_BASE + item.img;
                img.alt = "";
                img.loading = "lazy";
                img.width = 32;
                img.height = 32;
                img.addEventListener("error", () => img.remove());
                label.append(img);
            }
            const name = document.createElement("span");
            name.textContent = item.dlc; // DLC names are the game's, the same in every language (GDD §3.1)
            label.append(name);
            list.append(label);
        }
        wrap.append(title, list);
        return wrap;
    }));
}

function saveDlcFilter() {
    writeStorage(DLC_STORAGE_KEY, dlcBoxes().filter((box) => !box.checked).map((box) => box.value));
}

/** Questions left by the filter, per tier, and the warning for the tiers with fewer than FEW_QUESTIONS. */
function renderAvailable() {
    if (loadFailed) {
        availableEl.textContent = t(lang, "tqLoadError");
        fewEl.hidden = true;
        startButton.disabled = true;
        return;
    }
    if (!bank) return;
    const counts = tierCounts(filterBank(bank.questions, checkedDlcs()));
    const total = TIERS.reduce((sum, tier) => sum + counts[tier], 0);
    availableEl.textContent = format(t(lang, "tqAvailable"), { total, tiers: TIERS.map((tier) => counts[tier]).join(" / ") });
    const few = TIERS.filter((tier) => counts[tier] < FEW_QUESTIONS);
    fewEl.hidden = few.length === 0;
    fewEl.textContent = few.length ? format(t(lang, "tqFewWarning"), { tiers: few.join(", "), min: FEW_QUESTIONS }) : "";
    startButton.disabled = total === 0;
}

function setAllDlcs(checked) {
    dlcBoxes().forEach((box) => { box.checked = checked; });
    saveDlcFilter();
    renderAvailable();
}

// ── Top 10 ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(htmlLangCode(lang));
}

/** Draws the top 10 into the elements `<prefix>-source`, `-list` and `-empty`. */
function renderTop(prefix = "tq-top") {
    const source = el(`${prefix}-source`);
    const list = el(`${prefix}-list`);
    if (!board) {
        source.textContent = t(lang, "tqTopLoading");
        list.replaceChildren();
        el(`${prefix}-empty`).hidden = true;
        return;
    }
    source.textContent = t(lang, board.shared ? "tqTopShared" : "tqTopLocal");
    source.classList.toggle("is-local", !board.shared);
    el(`${prefix}-empty`).hidden = board.entries.length > 0;
    list.replaceChildren(...board.entries.map((entry, index) => {
        const item = document.createElement("li");
        item.className = "tq-top-entry";
        if (sameEntry(entry, board.highlight)) item.classList.add("is-new");
        const rank = document.createElement("span");
        rank.className = "tq-top-rank";
        rank.textContent = String(index + 1);
        const name = document.createElement("span");
        name.className = "tq-top-name";
        name.textContent = entry.name;
        const detail = document.createElement("span");
        detail.className = "tq-top-detail";
        detail.textContent = format(t(lang, "tqTopEntry"), {
            score: entry.score, tier: entry.maxTier, correct: entry.correct, answered: entry.answered, dlcs: entry.dlcs, date: formatDate(entry.date),
        });
        item.append(rank, name, detail);
        return item;
    }));
}

async function refreshTop() {
    board = null;
    renderTop();
    board = await loadBoard(RULESET_ID);
    renderTop();
}

// ── Screens ─────────────────────────────────────────────────────────────────

function showScreen(name) {
    for (const [key, section] of Object.entries(screens)) section.hidden = key !== name;
}

const tierName = (tier) => t(lang, `tqTier${tier}`);
const livesText = () => format(t(lang, "tqLives"), { lives: game.lives, max: LIVES });
const answerText = (question, bankIndex) => question.answers[lang][bankIndex];

function startGame() {
    if (!bank) return;
    game = createGame(filterBank(bank.questions, checkedDlcs()), { recent: readStorage(RECENT_STORAGE_KEY, []) });
    game.dlcCount = checkedDlcs().size; // shown next to the score in the top 10 (GDD §4)
    endState = { offer: false, saved: null, error: null };
    el("tq-name").value = "";
    showScreen("game");
    advance();
}

/** Next question, or the end screen when the game is over. */
function advance() {
    lastResult = null;
    lifelineStatus = null;
    announceEl.textContent = "";
    const question = game.over ? null : nextQuestion(game);
    if (!question) {
        showEnd();
        return;
    }
    writeStorage(RECENT_STORAGE_KEY, mergeRecent(readStorage(RECENT_STORAGE_KEY, []), game));
    renderGame();
    questionEl.focus();
}

function renderHud() {
    const { tier } = game.current.question;
    el("tq-hud-tier").textContent = format(t(lang, "tqTierLabel"), { tier, name: tierName(tier) });
    el("tq-hud-number").textContent = format(t(lang, "tqQuestionNumber"), { n: game.number });
    el("tq-hud-score").textContent = format(t(lang, "tqScore"), { score: game.score });
    const hearts = document.createElement("span");
    hearts.className = "tq-hearts";
    hearts.setAttribute("aria-hidden", "true");
    hearts.textContent = "♥".repeat(game.lives) + "♡".repeat(LIVES - game.lives);
    el("tq-hud-lives").replaceChildren(hearts, " ", livesText());
    renderLifelines();
}

/** The three lifeline buttons: name, what it does, and whether it is used, active or available. */
function renderLifelines() {
    for (const name of LIFELINES) {
        const button = el(`tq-lifeline-${name}`);
        const used = game.lifelines[name];
        const active = name === "shield" && game.current.shield;
        const title = document.createElement("span");
        title.className = "tq-lifeline-name";
        title.textContent = t(lang, `tqLifeline_${name}`);
        const hint = document.createElement("span");
        hint.className = "tq-lifeline-hint";
        hint.textContent = active ? t(lang, "tqLifelineActive") : used ? t(lang, "tqLifelineUsed") : t(lang, `tqLifelineHint_${name}`);
        button.replaceChildren(title, hint);
        button.disabled = !canUseLifeline(game, name);
        button.classList.toggle("is-used", used && !active);
        button.classList.toggle("is-active", active);
    }
    el("tq-lifeline-status").textContent = lifelineStatus ? t(lang, lifelineStatus) : "";
}

const LIFELINE_ACTIONS = { fifty: [useFifty, "tqFiftyDone"], skip: [useSkip, "tqSkipDone"], shield: [useShield, "tqShieldOn"] };

function onLifeline(name) {
    if (!game || !canUseLifeline(game, name)) return;
    const [use, message] = LIFELINE_ACTIONS[name];
    use(game);
    lifelineStatus = message;
    if (name === "skip") writeStorage(RECENT_STORAGE_KEY, mergeRecent(readStorage(RECENT_STORAGE_KEY, []), game));
    renderGame();
    // the focus goes on: to the question after a jump, else to the first answer left
    if (name === "skip") questionEl.focus();
    else answersEl.querySelector(".tq-answer:not(:disabled)")?.focus();
}

/** Draws the current question in the current language, with the answer order of the game. */
function renderGame() {
    const { question, order, removed, answered, chosenPosition } = game.current;
    renderHud();
    questionEl.textContent = question.text[lang];
    questionEl.dataset.questionId = question.id;
    if (question.icon) {
        iconEl.onerror = () => { iconEl.hidden = true; };
        iconEl.src = IMAGE_BASE + question.icon;
        iconEl.hidden = false;
    } else {
        iconEl.hidden = true;
        iconEl.removeAttribute("src");
    }
    const correctPosition = order.indexOf(question.correct);
    answersEl.replaceChildren(...order.map((bankIndex, position) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tq-answer";
        button.dataset.position = String(position);
        const letter = document.createElement("span");
        letter.className = "tq-answer-key";
        letter.setAttribute("aria-hidden", "true");
        letter.textContent = "ABCD"[position];
        const label = document.createElement("span");
        label.className = "tq-answer-text";
        label.textContent = answerText(question, bankIndex);
        button.append(letter, label);
        const isRemoved = removed.has(position);
        if (isRemoved) button.classList.add("is-removed");
        if (answered && position === correctPosition) button.classList.add("is-correct");
        if (answered && position === chosenPosition && position !== correctPosition) button.classList.add("is-wrong");
        button.disabled = answered || isRemoved;
        button.addEventListener("click", () => pick(position));
        return button;
    }));
    renderFeedback();
}

function renderFeedback() {
    feedbackEl.hidden = !lastResult;
    if (!lastResult) return;
    const { question } = game.current;
    const result = el("tq-feedback-result");
    result.className = `tq-feedback-result ${lastResult.correct ? "is-correct" : "is-wrong"}`;
    const lines = lastResult.correct
        ? [t(lang, "tqCorrect"), format(t(lang, "tqPointsGained"), { points: lastResult.points })]
        : [format(t(lang, "tqWrong"), { answer: answerText(question, question.correct) })];
    if (lastResult.tierUp) lines.push(format(t(lang, "tqTierUp"), { tier: lastResult.tierUp, name: tierName(lastResult.tierUp) }));
    result.textContent = lines.join(" ");
    el("tq-feedback-explanation").textContent = question.explanation[lang];
    el("tq-feedback-source").textContent = format(t(lang, "tqSource"), { file: question.source.file, key: question.source.key });
}

function pick(position) {
    if (!game || game.over || !game.current || game.current.answered || game.current.removed.has(position)) return;
    const tierBefore = game.tier;
    const result = answer(game, position);
    if (result.retry) { // Deflector Shields: that answer is crossed out, pick again
        lifelineStatus = "tqShieldHit";
        renderGame();
        announceEl.textContent = t(lang, "tqShieldHit");
        answersEl.querySelector(".tq-answer:not(:disabled)")?.focus();
        return;
    }
    lastResult = { ...result, tierUp: !game.over && game.tier > tierBefore ? game.tier : null };
    renderGame();
    const { question } = game.current;
    announceEl.textContent = result.correct
        ? format(t(lang, "tqAnnounceCorrect"), { lives: livesText() })
        : format(t(lang, "tqAnnounceWrong"), { answer: answerText(question, question.correct), lives: livesText() });
    el("tq-next").focus();
}

function showEnd() {
    showScreen("end");
    board = null;
    renderEnd();
    el("tq-end-title").focus();
    loadEndBoard();
}

/** Loads the top 10 for the end screen and offers the name input when the score enters it (GDD §7.1). */
async function loadEndBoard() {
    const ended = game;
    const loaded = await loadBoard(RULESET_ID);
    if (ended !== game) return; // a new game started meanwhile
    board = loaded;
    endState.offer = !endState.saved && qualifies(board.entries, { ...entryOf(game), date: new Date().toISOString() });
    renderNameForm();
    renderTop("tq-end-top");
}

/** The top 10 entry of an ended game (GDD §7.1), without its name and date. */
function entryOf(ended) {
    const result = summary(ended);
    const correctByTier = TIERS.map((tier) => ended.history.filter((item) => item.correct && item.tier === tier).length);
    return { score: result.score, maxTier: result.maxTier, answered: result.answered, correct: result.correct, correctByTier, dlcs: ended.dlcCount, rulesetId: RULESET_ID };
}

function renderNameForm() {
    const form = el("tq-name-form");
    form.hidden = !endState.offer;
    const input = el("tq-name");
    el("tq-name-count").textContent = format(t(lang, "tqNameCount"), { n: nameLength(normalizeName(input.value)), max: NAME_MAX });
    el("tq-name-error").textContent = endState.error ? t(lang, `tqNameError_${endState.error}`) : "";
    input.setAttribute("aria-invalid", String(Boolean(endState.error)));
    const saved = el("tq-saved");
    saved.hidden = !endState.saved;
    saved.textContent = endState.saved ? t(lang, endState.saved) : "";
}

async function saveName(event) {
    event.preventDefault();
    if (!endState.offer || !game?.over) return;
    const input = el("tq-name");
    endState.error = nameError(input.value);
    if (endState.error) {
        renderNameForm();
        input.focus();
        return;
    }
    const entry = { name: normalizeName(input.value), ...entryOf(game), date: new Date().toISOString() };
    el("tq-name-save").disabled = true;
    const result = await submitEntry(entry);
    el("tq-name-save").disabled = false;
    if (result.rejected) {
        // the hall of fame refused the name (word filter): a generic message, the player can change it
        endState.error = "rejected";
        renderNameForm();
        input.focus();
        return;
    }
    endState = { offer: false, saved: !result.shared ? "tqSavedLocal" : result.saved ? "tqSavedShared" : "tqSavedNotTop", error: null };
    board = { ...result, highlight: result.entry };
    renderNameForm();
    renderTop("tq-end-top");
    el("tq-saved").focus();
}

/** End screen (GDD §3.5): score, tier reached, right answers, lifelines used, completion bonus and the failed questions. */
function renderEnd() {
    const result = summary(game);
    el("tq-end-reason").textContent = t(lang, { lives: "tqEndLives", completed: "tqEndCompleted", gaveUp: "tqEndGaveUp" }[result.endReason]);
    const stats = [
        ["tqStatScore", String(result.score)],
        ["tqStatTier", format(t(lang, "tqTierLabel"), { tier: result.maxTier, name: tierName(result.maxTier) })],
        ["tqStatCorrect", format(t(lang, "tqStatCorrectValue"), { correct: result.correct, answered: result.answered })],
        ["tqStatLifelines", result.lifelines.length ? result.lifelines.map((name) => t(lang, `tqLifeline_${name}`)).join(", ") : t(lang, "tqStatNone")],
    ];
    if (result.bonus) stats.push(["tqStatBonus", format(t(lang, "tqStatBonusValue"), { bonus: result.bonus, lives: game.lives, per: COMPLETION_BONUS_PER_LIFE })]);
    renderFailed(result.failed);
    renderNameForm();
    renderTop("tq-end-top");
    el("tq-end-stats").replaceChildren(...stats.flatMap(([key, value]) => {
        const term = document.createElement("dt");
        term.textContent = t(lang, key);
        const detail = document.createElement("dd");
        detail.textContent = value;
        detail.dataset.stat = key;
        return [term, detail];
    }));
}

/** Each failed question: its text, the answer given, the right one, the explanation and the source. */
function renderFailed(failed) {
    el("tq-failed").hidden = false;
    el("tq-failed-none").hidden = failed.length > 0;
    const list = el("tq-failed-list");
    list.hidden = failed.length === 0;
    list.replaceChildren(...failed.map((entry) => {
        const question = questionsById.get(entry.id);
        const item = document.createElement("li");
        item.className = "tq-failed-item";
        item.dataset.questionId = entry.id;
        const lines = [
            ["tq-failed-question", question.text[lang]],
            ["tq-failed-yours", format(t(lang, "tqYourAnswer"), { answer: answerText(question, entry.chosen) })],
            ["tq-failed-right", format(t(lang, "tqRightAnswer"), { answer: answerText(question, question.correct) })],
            ["tq-failed-explanation", question.explanation[lang]],
            ["tq-source", format(t(lang, "tqSource"), { file: question.source.file, key: question.source.key })],
        ];
        item.append(...lines.map(([className, text]) => {
            const p = document.createElement("p");
            p.className = className;
            p.textContent = text;
            return p;
        }));
        return item;
    }));
}

async function giveUp() {
    const choice = await confirmChoice({
        title: t(lang, "tqGiveUpTitle"),
        message: t(lang, "tqGiveUpMessage"),
        buttons: [{ id: "giveUp", label: t(lang, "tqGiveUpConfirm"), variant: "danger" }, { id: "cancel", label: t(lang, "tqCancel") }],
    });
    if (choice !== "giveUp" || !game || game.over) return;
    endGame(game, "gaveUp");
    showEnd();
}

function onKeyDown(event) {
    if (screens.game.hidden || !game?.current || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".confirm-overlay")) return; // a dialog is open
    const key = event.key.toLowerCase();
    if (!game.current.answered && key in ANSWER_KEYS) {
        event.preventDefault();
        pick(ANSWER_KEYS[key]);
    } else if (game.current.answered && key === "enter" && document.activeElement?.tagName !== "BUTTON") {
        event.preventDefault();
        advance();
    }
}

// ── Set-up ──────────────────────────────────────────────────────────────────

/** XMLHttpRequest rather than fetch(): it also reads file:// pages (the smoke tests), where fetch() cannot. */
function getJson(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.responseType = "json";
        request.onload = () => (request.response && (request.status === 200 || request.status === 0) ? resolve(request.response) : reject(new Error(`HTTP ${request.status}`)));
        request.onerror = () => reject(new Error("network error"));
        request.send();
    });
}

async function loadBank() {
    try {
        bank = await getJson(BANK_URL);
        questionsById = new Map(bank.questions.map((question) => [question.id, question]));
    } catch (error) {
        loadFailed = true;
        console.warn("Testellaris: question bank not loaded", error);
    }
    renderAvailable();
}

applyPageTranslations();
buildDlcFilter();
dlcGroups.addEventListener("change", () => { saveDlcFilter(); renderAvailable(); });
el("tq-dlc-all").addEventListener("click", () => setAllDlcs(true));
el("tq-dlc-none").addEventListener("click", () => setAllDlcs(false));
startButton.addEventListener("click", startGame);
el("tq-next").addEventListener("click", advance);
el("tq-give-up").addEventListener("click", giveUp);
LIFELINES.forEach((name) => el(`tq-lifeline-${name}`).addEventListener("click", () => onLifeline(name)));
el("tq-play-again").addEventListener("click", startGame);
el("tq-back-start").addEventListener("click", () => { showScreen("start"); refreshTop(); startButton.focus(); });
document.addEventListener("keydown", onKeyDown);
el("tq-name-form").addEventListener("submit", saveName);
el("tq-name").addEventListener("input", () => { endState.error = null; renderNameForm(); });
onLanguageChange((next) => {
    lang = next;
    renderAvailable();
    renderTop();
    if (game && !screens.game.hidden) renderGame();
    if (game && !screens.end.hidden) renderEnd();
});
// The shared hall of fame is a Vercel function of the same site; from file:// there is none.
if (/^https?:$/.test(window.location.protocol)) hallOfFame.client = apiClient();
loadBank();
refreshTop();
