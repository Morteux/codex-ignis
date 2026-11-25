/**
 * Detail card of the tech tree (T3201, TECH_TREE_GDD.md section 6).
 *
 * Shown for the selected technology: icon slot, name and game id, tier, kind, area and field,
 * base cost, description, variants, prerequisites (buttons that select them, also those of
 * another area, which have no line), other requirements (Paradox script text, `NOT` ones marked),
 * the technologies it leads to, its unlocks (buildings and districts linked to the planet
 * simulator where T3007 linked them, with the jobs they give), effects, draw weight (information
 * only), repeatable levels, DLC and the data version. Game names and script texts stay in English
 * (GDD §4.3); the labels are translated.
 */
import { t, htmlLangCode } from "./i18n.js";
import { createTechIconSlot } from "./tech-tree-icons.js";
import { KIND_KEYS, gameNameSpan } from "./tech-tree-layout.js";
import { areaName, byLocalName } from "./tech-tree-names.js";

export { areaName };

/** Page of the planet simulator, target of the unlock links. */
export const SIMULATOR_URL = "planet-sim.html";

/** T3405: deep link to the catalogue entry of a simulator item ({collection, id} of the tech data). */
export function simulatorUrl(sim) {
  const type = sim.collection === "districts" ? "district" : "building";
  return SIMULATOR_URL + "#" + type + "=" + encodeURIComponent(sim.id);
}

const UNLOCK_TYPE_KEYS = {
  building: "techTreeUnlockBuilding",
  district: "techTreeUnlockDistrict",
  edict: "techTreeUnlockEdict",
  deposit: "techTreeUnlockDeposit",
};

const FLAG_KEYS = {
  start: "techTreeKindStarter",
  rare: "techTreeKindRare",
  dangerous: "techTreeKindDangerous",
  insight: "techTreeFlagInsight",
  repeatable: "techTreeKindRepeatable",
  event: "techTreeKindEvent",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/** Area names are game names: English in every language, like the area buttons. */

/** Number with the thousands separator of the language ("12 000", "12,000"). */
function formatNumber(value, lang) {
  return new Intl.NumberFormat(htmlLangCode(lang)).format(value);
}

/**
 * Creates the card controller. `onSelect(id)` is called by the technology buttons of the card;
 * `onClose()` by the close button. Returns `{ show(id), refresh() }`; `show(null)` hides it.
 */
export function createDetailCard(container, data, getLang, { onSelect, onClose }) {
  const byId = new Map(data.technologies.map((tech) => [tech.id, tech]));
  const fieldName = { get: (id) => data.fields.find((field) => field.id === id)?.name };
  const dependents = new Map();
  data.technologies.forEach((tech) => tech.prerequisites.forEach((id) => {
    if (!dependents.has(id)) dependents.set(id, []);
    dependents.get(id).push(tech.id);
  }));
  let current = null;

  function techButton(id, from, lang) {
    const tech = byId.get(id);
    const button = el("button", "tech-card-link tech-node--" + (tech ? tech.kind : "normal"));
    button.type = "button";
    button.dataset.techId = id;
    button.append(gameNameSpan(tech ? tech.name : id));
    if (tech) {
      const where = tech.area !== from.area ? " · " + areaName(tech.area) : "";
      button.append(el("span", "tech-card-link-meta", t(lang, "techTreeTier").replace("{tier}", tech.tier) + where));
    }
    button.addEventListener("click", () => onSelect(id));
    return button;
  }

  function section(key, name, ...children) {
    const block = el("section", "tech-card-section");
    block.dataset.section = name;
    block.append(el("h4", "tech-card-label", t(getLang(), key)), ...children);
    return block;
  }

  function list(items, className = "") {
    const ul = el("ul", "tech-card-list " + className);
    items.forEach((item) => {
      const li = el("li");
      li.append(item);
      ul.append(li);
    });
    return ul;
  }

  function unlockItem(unlock, lang) {
    const item = document.createDocumentFragment();
    item.append(el("span", "tech-card-unlock-type", t(lang, UNLOCK_TYPE_KEYS[unlock.type] || "techTreeUnlockOther") + ": "));
    if (unlock.sim) {
      const link = el("a", "tech-card-sim-link", unlock.name);
      link.href = simulatorUrl(unlock.sim);
      link.dataset.simCollection = unlock.sim.collection;
      link.dataset.simId = unlock.sim.id;
      link.title = t(lang, "techTreeOpenInSimulator");
      item.append(link, el("span", "tech-card-sim-badge", t(lang, "techTreeInSimulator")));
    } else {
      item.append(gameNameSpan(unlock.name));
    }
    if (unlock.jobs && unlock.jobs.length) {
      const jobs = el("span", "tech-card-jobs", " · " + t(lang, "techTreeUnlockJobs") + ": ");
      unlock.jobs.forEach((job, index) => {
        const code = el("code", job.sim ? "is-linked" : "", job.id);
        if (job.sim) code.title = t(lang, "techTreeInSimulator") + ": " + job.sim;
        jobs.append(index ? ", " : "", code);
      });
      item.append(jobs);
    }
    return item;
  }

  function render() {
    const lang = getLang();
    const tech = current && byId.get(current);
    container.hidden = !tech;
    document.body.classList.toggle("has-tech-card", Boolean(tech));
    container.dataset.techId = tech ? tech.id : "";
    if (!tech) {
      container.replaceChildren();
      return;
    }

    const head = el("header", "tech-card-head");
    const titles = el("div", "tech-card-titles");
    const title = el("h3", "tech-card-name", tech.name);
    title.id = "tech-card-title";
    titles.append(
      title,
      el("code", "tech-card-id", tech.id),
      el("p", "tech-card-meta"),
    );
    titles.lastChild.append(
      [t(lang, "techTreeTier").replace("{tier}", tech.tier), t(lang, KIND_KEYS[tech.kind] || KIND_KEYS.normal)].join(" · ") + " · ",
      gameNameSpan(areaName(tech.area) + " · " + (fieldName.get(tech.field) || tech.field)),
    );
    // T3205: permanent link to this technology (copy it from the browser's link menu)
    const permalink = el("a", "tech-card-permalink", t(lang, "techTreePermalink"));
    permalink.href = "#" + tech.id;
    titles.append(permalink);
    const close = el("button", "tech-card-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", t(lang, "techTreeCardClose"));
    close.addEventListener("click", onClose);
    head.append(createTechIconSlot(tech, "card"), titles, close);
    head.classList.add("tech-node--" + tech.kind);

    const facts = el("dl", "tech-card-facts");
    const fact = (key, value, name) => {
      const wrap = el("div");
      wrap.dataset.fact = name;
      wrap.append(el("dt", "", t(lang, key)), el("dd", "", value));
      facts.append(wrap);
    };
    fact("techTreeBaseCost", tech.baseCost === null ? t(lang, "techTreeNoCost") : formatNumber(tech.baseCost, lang), "cost");
    if (tech.repeatable) {
      fact("techTreeCostPerLevel", formatNumber(tech.repeatable.costPerLevel, lang), "costPerLevel");
      fact("techTreeLevels", tech.repeatable.levels === null ? t(lang, "techTreeUnlimited") : String(tech.repeatable.levels), "levels");
    }
    if (tech.flags.length) fact("techTreeFlags", tech.flags.map((flag) => t(lang, FLAG_KEYS[flag]) || flag).join(", "), "flags");
    fact("techTreeDlc", tech.dlc.length ? tech.dlc.join(", ") : t(lang, "techTreeBaseGame"), "dlc");
    fact("techTreeVersion", data.rulesetId + " · " + data.gameVersion, "version");

    const blocks = [];
    if (tech.description) {
      const description = el("p", "tech-card-description", tech.description);
      description.lang = "en";
      blocks.push(description);
    }
    blocks.push(el("p", "tech-card-note", t(lang, "techTreeBaseCostNote")));
    if (tech.variants.length) {
      blocks.push(section("techTreeVariants", "variants", list(tech.variants.map((variant) => {
        const item = document.createDocumentFragment();
        item.append(gameNameSpan(variant.name + " "), el("code", "", variant.condition));
        return item;
      }))));
    }
    blocks.push(section("techTreePrerequisites", "prerequisites", tech.prerequisites.length
      ? list(tech.prerequisites.map((id) => techButton(id, tech, lang)), "tech-card-techs")
      : el("p", "tech-card-empty", t(lang, "techTreeNone"))));
    if (tech.requirements.length) {
      blocks.push(section("techTreeRequirements", "requirements", list(tech.requirements.map((requirement) => {
        const item = document.createDocumentFragment();
        if (requirement.not) item.append(el("span", "tech-card-not", t(lang, "techTreeRequirementNot") + " "));
        item.append(el("code", "", requirement.text));
        return item;
      }))));
    }
    const leadsTo = (dependents.get(tech.id) || []).slice().sort((a, b) => byLocalName(lang)(byId.get(a).name, byId.get(b).name));
    blocks.push(section("techTreeLeadsTo", "leadsTo", leadsTo.length
      ? list(leadsTo.map((id) => techButton(id, tech, lang)), "tech-card-techs")
      : el("p", "tech-card-empty", t(lang, "techTreeNone"))));
    if (tech.unlocks.length) {
      blocks.push(section("techTreeUnlocks", "unlocks", list(tech.unlocks.map((unlock) => unlockItem(unlock, lang)))));
    }
    if (tech.effects.length) {
      blocks.push(section("techTreeEffects", "effects", list(tech.effects.map((line) => el("code", "", line)))));
    }
    const weight = section("techTreeDrawWeight", "drawWeight",
      el("p", "tech-card-weight", t(lang, "techTreeWeightBase").replace("{base}", tech.drawWeight.base === null ? t(lang, "techTreeNoWeight") : tech.drawWeight.base)));
    if (tech.drawWeight.modifiers.length) weight.append(list(tech.drawWeight.modifiers.map((line) => el("code", "", line)), "tech-card-modifiers"));
    weight.append(el("p", "tech-card-note", t(lang, "techTreeWeightNote")));
    blocks.push(weight);

    container.replaceChildren(head, facts, ...blocks);
  }

  return {
    show(id) {
      current = id || null;
      render();
      if (current) container.scrollTop = 0;
    },
    refresh: render,
  };
}
