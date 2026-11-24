/**
 * Edicts tab (P18.3): cards grouped by wiki section, toggled on/off. The
 * selection itself lives in js/empire.js (it is saved with the empire
 * profile); this module only draws it. Applied effects are listed first and
 * info-only effects after them, greyed out (see js/edict-data.js).
 */

import { t } from "./i18n.js";
import { EDICTS, EDICT_KINDS, edictAvailable, edictUnmetRules, edictTraditionRules } from "./edict-data.js";
import { STRATUM_I18N_KEYS } from "./planet-data.js";
import { num, pct, resourceName, jobName as jobNameIn } from "./sim-text-helpers.js";

/** Applied effect lines of an edict, in the wiki's wording. */
function edictEffectLines(lang, edict) {
  const effects = edict.effects || {};
  const jobName = (jobId) => jobNameIn(lang, jobId);
  const lines = [];
  Object.entries(effects.jobEfficiency || {}).forEach(([jobId, fraction]) => lines.push(t(lang, "edictLineJobEfficiency")(pct(fraction), jobName(jobId))));
  Object.entries(effects.stratumEfficiency || {}).forEach(([stratum, fraction]) => lines.push(t(lang, "edictLineJobEfficiency")(pct(fraction), t(lang, STRATUM_I18N_KEYS[stratum]))));
  Object.entries(effects.jobFlat || {}).forEach(([jobId, perJob]) => Object.entries(perJob).forEach(([resourceId, amount]) => {
    lines.push(t(lang, "edictLineJobFlat")(num(amount), resourceName(lang, resourceId), jobName(jobId)));
  }));
  Object.entries(effects.jobUpkeep || {}).forEach(([jobId, fraction]) => {
    lines.push(jobId === "all" ? t(lang, "edictLineJobUpkeepAll")(pct(fraction)) : t(lang, "edictLineJobUpkeep")(pct(fraction), jobName(jobId)));
  });
  Object.entries(effects.civilianFlat || {}).forEach(([resourceId, amount]) => lines.push(t(lang, "edictLineCivilianFlat")(num(amount), resourceName(lang, resourceId))));
  Object.entries(effects.resourceMult || {}).forEach(([resourceId, fraction]) => lines.push(t(lang, "edictLineMonthly")(pct(fraction), resourceName(lang, resourceId))));
  Object.entries(effects.popUpkeep || {}).forEach(([resourceId, fraction]) => lines.push(t(lang, "edictLinePopUpkeep")(pct(fraction), resourceName(lang, resourceId))));
  const speciesHappiness = Object.entries(effects.speciesHappiness || {});
  if (speciesHappiness.length) lines.push(t(lang, "edictLineSpeciesHappiness")(num(speciesHappiness[0][1])));
  const conditions = effects.conditions || {};
  ["happiness", "stability", "crime"].forEach((stat) => {
    if (conditions[stat]) lines.push(t(lang, `edictLine_${stat}`)(num(conditions[stat])));
  });
  return lines;
}

function upkeepText(lang, edict) {
  return Object.entries(edict.upkeep || {}).map(([resourceId, amount]) => `${amount} ${resourceName(lang, resourceId)}`).join(", ");
}

/**
 * Draws the edict cards into `container`.
 * options: { lang, ctx (requirement context), selected (Set of ids), onToggle(id), describeRule(rule) }
 */
export function renderEdictsList(container, { lang, ctx, selected, onToggle, describeRule }) {
  if (!container) return;
  container.replaceChildren();
  EDICT_KINDS.forEach((kind) => {
    const edicts = EDICTS.filter((edict) => edict.kind === kind.id);
    if (!edicts.length) return;
    const section = document.createElement("section");
    section.className = "empire-policy-group";
    const title = document.createElement("h3");
    title.textContent = t(lang, kind.i18nKey);
    const grid = document.createElement("div");
    grid.className = "empire-policy-grid";
    edicts.forEach((edict) => {
      const available = edictAvailable(edict, ctx);
      const isSelected = selected.has(edict.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "empire-authority-card empire-policy-card edict-card";
      card.dataset.edictId = edict.id;
      card.classList.toggle("is-selected", isSelected);
      card.disabled = !available && !isSelected;
      card.setAttribute("aria-pressed", String(isSelected));
      const header = document.createElement("div");
      header.className = "empire-authority-header";
      const name = document.createElement("strong");
      name.textContent = t(lang, edict.i18nKey);
      header.append(name);
      const upkeep = document.createElement("span");
      upkeep.className = "edict-upkeep";
      upkeep.textContent = t(lang, "edictUpkeepLabel")(upkeepText(lang, edict));
      card.append(header, upkeep);
      const list = document.createElement("ul");
      list.className = "empire-effect-list";
      edictEffectLines(lang, edict).forEach((line) => {
        const item = document.createElement("li");
        item.className = "is-applied";
        item.textContent = line;
        list.append(item);
      });
      (edict.info || []).forEach((key) => {
        const item = document.createElement("li");
        item.className = "is-info";
        item.textContent = t(lang, key);
        list.append(item);
      });
      card.append(list);
      edictTraditionRules(edict).forEach((rule) => {
        const note = document.createElement("p");
        note.className = "empire-policy-federation-note";
        note.textContent = t(lang, "edictTraditionNote")(t(lang, rule.i18nKey));
        card.append(note);
      });
      if (!available) {
        const lock = document.createElement("em");
        lock.className = "empire-authority-lock";
        lock.textContent = edictUnmetRules(edict, ctx).map(describeRule).filter(Boolean).join("; ");
        card.append(lock);
      }
      card.addEventListener("click", () => { if (available || isSelected) onToggle(edict.id); });
      grid.append(card);
    });
    section.append(title, grid);
    container.append(section);
  });
}
