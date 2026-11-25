/**
 * Testellaris (testellaris.html), the Stellaris quiz: page script (TESTELLARIS_GDD.md §8).
 *
 * Loads the question bank of the ruleset (data/testellaris/<rulesetId>/questions.json) and
 * drives the screens: start (rules and DLC filter). The rules without DOM live in
 * js/testellaris-engine.js. The language and the static markup are handled by the shared
 * shell (js/page-shell.js); this module repaints its dynamic parts on a language change.
 */

import { t } from "./i18n.js";
import "./i18n-testellaris.js";
import { getLang, applyPageTranslations, onLanguageChange } from "./page-shell.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { DLC_BINGO } from "./bingo-game-items.js";
import { TIERS, FEW_QUESTIONS, filterBank, tierCounts } from "./testellaris-engine.js";

export const RULESET_ID = "stellaris-pc-4.5.4";
const BANK_URL = `data/testellaris/${RULESET_ID}/questions.json`;
/** Unchecked DLC names (so a DLC added later starts checked), GDD §4. */
const DLC_STORAGE_KEY = "testellaris-dlc-off";

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

let lang = getLang();
let bank = null; // { rulesetId, questions } once loaded
let loadFailed = false;

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
onLanguageChange((next) => {
    lang = next;
    renderAvailable();
});
loadBank();
