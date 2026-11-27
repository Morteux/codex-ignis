/**
 * Testellaris: game icons of the concepts (ICONS.md, T2609) in the question texts, explanations and answers.
 *
 * Only the question templates that ask about one of those concepts get an icon, so a game name that happens to
 * hold the word ("Communal Housing Outreach", "Improved Production") never does. Each rule gives the concept and
 * the word to put the icon in front of in each language (first match only). The word stays visible, so the icon is
 * decorative for screen readers (empty alt) and repeats the concept word as its tooltip.
 *
 * Upkeep and output icons are per resource in the game: they are shown only when the question carries the one
 * resource it asks about (`resource`, written by tools/testellaris/q_economy.py). The "same resource as…" questions
 * get none, since the resource icon would give half of the answer away.
 */

import { t } from "./i18n.js";
import { conceptIconUrl, resourceModifierIconUrl } from "./concept-icons.js";

const WORDS = {
    upkeep: { en: /upkeep/i, es: /mantenimiento/i, jp: /維持費/ },
    output: { en: /output/i, es: /producción/i, jp: /生産量/ },
    build: { en: /\bbuild\b/i, es: /construirse/i, jp: /建設/ },
    days: { en: /\bdays\b/i, es: /días/i, jp: /日数|\d+日/ },
    housing: { en: /housing/i, es: /vivienda/i, jp: /住居/ },
    stability: { en: /stability/i, es: /estabilidad/i, jp: /安定度/ },
    happiness: { en: /happiness/i, es: /felicidad/i, jp: /幸福度/ },
    stratum: { en: /stratum/i, es: /estrato/i, jp: /階層/ },
};

/** Stratum of the answers (English game name) → concept of js/concept-icons.js. */
const STRATUM_ANSWERS = { Elite: "ruler", Specialist: "specialist", Worker: "worker", "Complex Drone": "complexDrone", "Menial Drone": "simpleDrone" };

/** i18n key of the concept word (tooltip of the icon). */
const LABEL_KEYS = {
    upkeep_add: "tqIconUpkeep", produces_add: "tqIconOutput", buildTime: "tqIconBuildTime", housing: "tqIconHousing",
    stability: "tqIconStability", happiness: "tqIconHappiness", popUpkeep: "tqIconPopUpkeep",
    ruler: "tqIconRuler", specialist: "tqIconSpecialist", worker: "tqIconWorker", complexDrone: "tqIconComplexDrone", simpleDrone: "tqIconSimpleDrone",
};

const stratumOfId = (question) => question.id.split(".").pop();
const correctStratum = (question) => STRATUM_ANSWERS[question.answers.en[question.correct]] || null;

/**
 * Template (`<topic>.<template>`) → icons of its texts: [{ concept | kind, word, explanation? }]. `concept` may be a
 * function of the question; `explanation: false` keeps the explanation without that icon.
 */
const RULES = {
    "economy.job_base_output": [{ kind: "produces_add", word: "output" }],
    "economy.job_base_upkeep": [{ kind: "upkeep_add", word: "upkeep" }],
    "economy.building_base_upkeep": [{ kind: "upkeep_add", word: "upkeep" }],
    "economy.building_days": [{ concept: "buildTime", word: "days" }],
    "economy.building_slowest": [{ concept: "buildTime", word: "build" }, { concept: "buildTime", word: "days", text: false }],
    "planets.blocker_time": [{ concept: "buildTime", word: "days" }],
    "planets.capital_housing": [{ concept: "housing", word: "housing" }],
    "modifiers.modifier_amount": [{ concept: (q) => ({ stability: "stability", happiness: "happiness" })[stratumOfId(q)] || null, word: (q) => stratumOfId(q) }],
    "economy.living_power": [{ concept: stratumOfId, word: "stratum" }],
    "economy.living_power_most": [{ concept: stratumOfId, word: "stratum" }],
    "economy.living_upkeep_most": [{ concept: stratumOfId, word: "stratum" }, { concept: "popUpkeep", word: "upkeep" }],
    "economy.job_stratum": [{ concept: correctStratum, word: "stratum", text: false }],
};

const templateOf = (question) => question.id.split(".").slice(0, 2).join(".");

function iconImg(src, word, concept) {
    const img = document.createElement("img");
    img.className = "concept-icon tq-concept-icon";
    img.src = src;
    img.loading = "lazy";
    img.alt = ""; // the word is next to it
    img.title = word;
    img.dataset.concept = concept;
    img.onerror = () => { img.hidden = true; };
    return img;
}

/** { src, word, concept } of a rule for a question, or null. */
function ruleIcon(rule, question, lang) {
    if (rule.kind) {
        const src = question.resource ? resourceModifierIconUrl(question.resource, rule.kind) : null;
        return src ? { src, word: t(lang, LABEL_KEYS[rule.kind]), concept: `${rule.kind}:${question.resource}` } : null;
    }
    const concept = typeof rule.concept === "function" ? rule.concept(question) : rule.concept;
    const src = concept && LABEL_KEYS[concept] ? conceptIconUrl(concept) : null;
    return src ? { src, word: t(lang, LABEL_KEYS[concept]), concept } : null;
}

/** Text with the icons of the rules placed in front of their words: array of strings and <img> nodes. */
function decorate(text, question, lang, part) {
    const rules = RULES[templateOf(question)] || [];
    const marks = [];
    for (const rule of rules) {
        if (rule[part] === false) continue;
        const icon = ruleIcon(rule, question, lang);
        const words = WORDS[typeof rule.word === "function" ? rule.word(question) : rule.word];
        const match = icon && words && words[lang] ? text.match(words[lang]) : null;
        if (match && !marks.some((mark) => mark.index === match.index)) marks.push({ index: match.index, icon });
    }
    if (!marks.length) return [text];
    marks.sort((a, b) => a.index - b.index);
    const nodes = [];
    let from = 0;
    for (const { index, icon } of marks) {
        if (index > from) nodes.push(text.slice(from, index));
        nodes.push(iconImg(icon.src, icon.word, icon.concept));
        from = index;
    }
    nodes.push(text.slice(from));
    return nodes;
}

/** Nodes of the question text in a language, with its concept icons. */
export const questionNodes = (question, lang) => decorate(question.text[lang], question, lang, "text");

/** Nodes of the explanation in a language, with its concept icons. */
export const explanationNodes = (question, lang) => decorate(question.explanation[lang], question, lang, "explanation");

/** Stratum icon of an answer (job stratum questions), or null. */
export function answerIcon(question, bankIndex, lang) {
    if (templateOf(question) !== "economy.job_stratum") return null;
    const concept = STRATUM_ANSWERS[question.answers.en[bankIndex]];
    return concept ? iconImg(conceptIconUrl(concept), t(lang, LABEL_KEYS[concept]), concept) : null;
}
