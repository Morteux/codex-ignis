/**
 * Planet simulator, Celestial body tab: deposit features, blockers and planet modifiers.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { STRATUM_I18N_KEYS, RESOURCES, RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { PLANET_MODIFIERS, PLANET_MODIFIER_GROUPS } from "./planet-modifier-data.js";
import { DEPOSIT_FEATURE_COUNT, BLOCKERS } from "./planetary-features-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { initInfoButtons } from "./info-panels.js";
import { unmetRequirements, unmodelledRequirements } from "./building-requirements.js";
import { refresh } from "./planet-sim.js";
import { requiredDepositFeatures, districtDisplayName, requirementContext, blockerFitsBody, blockerInactiveReason, planetModifierFitsBody, planetModifierExcludedBy } from "./planet-sim-rules.js";
import { strategicDepositChoice, selectedBlockers, selectedPlanetModifiers } from "./planet-sim-state.js";
import { describeUnmetRule } from "./planet-sim-text.js";

/** P10.8: "Required deposit features" panel of the Cuerpo celeste tab (computed from the built resource districts). */
const depositFeaturesEl = document.querySelector("#celestial-deposit-features");
export function renderDepositFeatures() {
  if (!depositFeaturesEl) return;
  depositFeaturesEl.replaceChildren();
  const result = requiredDepositFeatures();
  const addNote = (text, className = "planet-district-note") => {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    depositFeaturesEl.append(p);
    return p;
  };
  if (!result) { addNote(t(getLang(), "featuresNotApplicable")); return; }
  addNote(t(getLang(), "featuresIntro"));
  const list = document.createElement("ul");
  list.className = "celestial-feature-list";
  result.features.forEach((group) => {
    const item = document.createElement("li");
    item.className = "celestial-feature";
    item.dataset.feature = group.feature.id;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${group.feature.img}`;
    img.alt = "";
    img.loading = "lazy";
    const text = document.createElement("span");
    const caps = RESOURCE_DISTRICT_ORDER.filter((cat) => group.feature.caps[cat]).map((cat) => `+${group.feature.caps[cat]} ${districtDisplayName(cat)}`).join(", ");
    text.textContent = `${group.copies > 1 ? `${group.copies}× ` : ""}${t(getLang(), group.feature.i18nKey)} (${caps})`;
    item.append(img, text);
    if (group.alternatives.length) {
      const alt = document.createElement("small");
      alt.textContent = t(getLang(), "featuresAlternatives") + group.alternatives.map((feature) => t(getLang(), feature.i18nKey)).join(", ");
      item.append(alt);
    }
    list.append(item);
  });
  result.strategic.forEach(({ specialization, deposit, candidates }) => {
    const item = document.createElement("li");
    item.className = "celestial-feature is-strategic";
    item.dataset.feature = deposit.id;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${deposit.img}`;
    img.alt = "";
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = t(getLang(), "featuresStrategicFor")(t(getLang(), specialization.i18nKey));
    const select = document.createElement("select");
    select.className = "celestial-strategic-select";
    select.dataset.specialization = specialization.id;
    candidates.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      const caps = RESOURCE_DISTRICT_ORDER.filter((cat) => candidate.caps[cat]).map((cat) => `+${candidate.caps[cat]} ${districtDisplayName(cat)}`).join(", ");
      const bonus = candidate.jobBonus ? `, +${candidate.jobBonus.perJob} ${t(getLang(), RESOURCES[candidate.jobBonus.resource].i18nKey)} / ${t(getLang(), "featuresPerJobCategory_" + candidate.jobBonus.category)}` : "";
      option.textContent = `${t(getLang(), candidate.i18nKey)} (${caps}${bonus})`;
      option.selected = candidate.id === deposit.id;
      select.append(option);
    });
    select.addEventListener("change", () => { strategicDepositChoice[specialization.id] = select.value; refresh(); });
    item.append(img, label, select);
    list.prepend(item);
  });
  if (result.features.length || result.strategic.length) depositFeaturesEl.append(list);
  else addNote(t(getLang(), "featuresNoneNeeded"));
  result.uncapped.forEach((cat) => addNote(t(getLang(), "featuresUncapped")(districtDisplayName(cat))));
  result.uncovered.forEach((cat) => addNote(t(getLang(), "featuresUncovered")(districtDisplayName(cat)), "planet-district-note is-warning"));
  const count = result.count || 0;
  const total = addNote(t(getLang(), "featuresCount")(count), "celestial-feature-count");
  total.dataset.count = String(count);
  if (count < DEPOSIT_FEATURE_COUNT.min || count > DEPOSIT_FEATURE_COUNT.max) {
    const warning = addNote(t(getLang(), count < DEPOSIT_FEATURE_COUNT.min ? "featuresTooFew" : "featuresTooMany")(count, DEPOSIT_FEATURE_COUNT.min, DEPOSIT_FEATURE_COUNT.max), "planet-district-note is-warning");
    warning.id = "celestial-feature-warning";
  }
}

/** P10.8: selectable blockers of the Cuerpo celeste tab (only the useful ones, GDD §4.2). */
const blockersEl = document.querySelector("#celestial-blockers");
export function renderBlockers() {
  if (!blockersEl) return;
  blockersEl.replaceChildren();
  const ctx = requirementContext();
  const fitting = BLOCKERS.filter((blocker) => blockerFitsBody(blocker) || selectedBlockers.has(blocker.id));
  if (!fitting.length) {
    const p = document.createElement("p");
    p.className = "planet-district-note";
    p.textContent = t(getLang(), "blockersNone");
    blockersEl.append(p);
    return;
  }
  const list = document.createElement("ul");
  list.className = "celestial-feature-list";
  fitting.forEach((blocker) => {
    const item = document.createElement("li");
    item.className = "celestial-feature celestial-blocker";
    item.dataset.blocker = blocker.id;
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = selectedBlockers.has(blocker.id);
    box.addEventListener("change", () => {
      if (box.checked) selectedBlockers.add(blocker.id); else selectedBlockers.delete(blocker.id);
      refresh();
    });
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${blocker.img}`;
    img.alt = "";
    img.loading = "lazy";
    const name = document.createElement("span");
    const effects = [
      ...Object.entries(blocker.flat || {}).map(([resourceId, amount]) => `+${amount} ${t(getLang(), RESOURCES[resourceId].i18nKey)}`),
      ...(blocker.jobBonus ? [`+${blocker.jobBonus.perJob} ${t(getLang(), RESOURCES[blocker.jobBonus.resource].i18nKey)} / ${t(getLang(), "featuresPerJobCategory_" + blocker.jobBonus.category)}`] : []),
      ...(blocker.amenities ? [`+${blocker.amenities} ${t(getLang(), "resourceAmenities")}`] : []),
      ...(blocker.locksFirstSpecialization ? [t(getLang(), "blockerLocksFirstSlot")] : [])
    ];
    name.textContent = `${t(getLang(), blocker.i18nKey)} (${effects.join(", ")})`;
    label.append(box, img, name);
    item.append(label);
    const notes = [];
    const unmodelled = unmodelledRequirements(blocker).map((rule) => t(getLang(), rule.i18nKey));
    if (unmodelled.length) notes.push(t(getLang(), "requirementUnmodelled") + unmodelled.join("; "));
    const reason = selectedBlockers.has(blocker.id) ? blockerInactiveReason(blocker, ctx) : (unmetRequirements(blocker, ctx).map(describeUnmetRule).filter(Boolean).join("; ") || null);
    if (reason) {
      notes.push(selectedBlockers.has(blocker.id) ? t(getLang(), "blockerInactive")(reason) : reason);
      item.classList.toggle("is-inactive", selectedBlockers.has(blocker.id));
    }
    if (notes.length) {
      const small = document.createElement("small");
      small.textContent = notes.join(" · ");
      item.append(small);
    }
    list.append(item);
  });
  blockersEl.append(list);
}

/** P10.8: planet modifiers of the Cuerpo celeste tab, grouped like the wiki (collapsed groups, the chosen ones listed first). */
const planetModifiersEl = document.querySelector("#celestial-planet-modifiers");
const openModifierGroups = new Set();
function planetModifierEffectText(modifier) {
  const e = modifier.effects;
  const sign = (value) => (value > 0 ? `+${value}` : `${value}`);
  const res = (id) => (id === "all" ? t(getLang(), "planetModifierAllResources") : t(getLang(), RESOURCES[id].i18nKey));
  const parts = [
    ...Object.entries(e.jobResourcePct || {}).map(([id, pct]) => `${sign(pct)}% ${res(id)} ${t(getLang(), "planetModifierFromJobs")}`),
    ...(e.jobCategoryFlat || []).map((bonus) => `${sign(bonus.perJob)} ${res(bonus.resource)} / ${t(getLang(), "featuresPerJobCategory_" + bonus.category)}`),
    ...Object.entries(e.conditions || {}).map(([stat, value]) => `${sign(value)} ${t(getLang(), { happiness: "conditionsHappiness", stability: "conditionsStability", crime: "conditionsCrime" }[stat])}`),
    ...Object.entries(e.conditionsByEmpire || {}).flatMap(([empire, stats]) => Object.entries(stats).map(([stat, value]) => `${sign(value)} ${t(getLang(), { happiness: "conditionsHappiness", stability: "conditionsStability" }[stat])} (${t(getLang(), empire === "gestalt" ? "planetModifierIfGestalt" : "planetModifierIfIndividualist")})`)),
    ...Object.entries(e.flat || {}).map(([stat, value]) => `${sign(value)} ${t(getLang(), stat === "housing" ? "planetSimStatHousingShort" : "resourceAmenities")}`),
    ...Object.entries(e.pct || {}).map(([stat, value]) => `${sign(value)}% ${t(getLang(), stat === "housing" ? "planetSimStatHousingShort" : "resourceAmenities")}`),
    ...Object.entries(e.maxDistricts || {}).map(([cat, value]) => `${sign(value)} ${t(getLang(), "planetModifierMaxDistricts")(districtDisplayName(cat))}`),
    ...Object.entries(e.stratumOutput || {}).map(([stratum, value]) => `${sign(value)}% ${t(getLang(), STRATUM_I18N_KEYS[stratum])} ${t(getLang(), "planetModifierOutput")}`),
    ...Object.entries(e.stratumEfficiency || {}).map(([stratum, value]) => `${sign(value)}% ${t(getLang(), STRATUM_I18N_KEYS[stratum])} ${t(getLang(), "planetModifierJobEfficiency")}`),
    ...(e.jobUpkeepPct ? [`${sign(e.jobUpkeepPct)}% ${t(getLang(), "planetModifierJobUpkeep")}`] : []),
    ...(e.popHousingUsagePct ? [`${sign(e.popHousingUsagePct)}% ${t(getLang(), "planetModifierPopHousingUsage")}`] : [])
  ];
  return parts.join(", ");
}
export function renderPlanetModifiers() {
  if (!planetModifiersEl) return;
  planetModifiersEl.replaceChildren();
  const intro = document.createElement("p");
  intro.className = "planet-district-note";
  intro.textContent = t(getLang(), "planetModifiersIntro");
  planetModifiersEl.append(intro);
  PLANET_MODIFIER_GROUPS.forEach((group) => {
    const modifiers = PLANET_MODIFIERS.filter((modifier) => modifier.group === group && (planetModifierFitsBody(modifier) || selectedPlanetModifiers.has(modifier.id)));
    if (!modifiers.length) return;
    const details = document.createElement("details");
    details.className = "celestial-modifier-group";
    details.dataset.group = group;
    const chosen = modifiers.filter((modifier) => selectedPlanetModifiers.has(modifier.id)).length;
    details.open = openModifierGroups.has(group);
    details.addEventListener("toggle", () => { if (details.open) openModifierGroups.add(group); else openModifierGroups.delete(group); });
    const summary = document.createElement("summary");
    summary.textContent = `${t(getLang(), "planetModifierGroup_" + group)}${chosen ? ` (${chosen})` : ""}`;
    details.append(summary);
    const list = document.createElement("ul");
    list.className = "celestial-feature-list";
    modifiers.forEach((modifier) => {
      const item = document.createElement("li");
      item.className = "celestial-feature celestial-blocker";
      item.dataset.modifier = modifier.id;
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selectedPlanetModifiers.has(modifier.id);
      const excludedBy = planetModifierExcludedBy(modifier);
      if (excludedBy && !box.checked) box.disabled = true;
      box.addEventListener("change", () => {
        if (box.checked) selectedPlanetModifiers.add(modifier.id); else selectedPlanetModifiers.delete(modifier.id);
        refresh();
      });
      label.append(box);
      if (modifier.img) {
        const img = document.createElement("img");
        img.src = `${IMAGE_BASE}${modifier.img}`;
        img.alt = "";
        img.loading = "lazy";
        label.append(img);
      }
      const name = document.createElement("span");
      name.textContent = `${t(getLang(), modifier.i18nKey)} (${planetModifierEffectText(modifier)})`;
      label.append(name);
      item.append(label);
      const notes = [];
      if (modifier.notModelledKeys?.length) notes.push(t(getLang(), "planetModifierNotModelled") + modifier.notModelledKeys.map((key) => t(getLang(), key)).join("; "));
      if (modifier.sourceKey) notes.push(t(getLang(), "planetModifierSource") + t(getLang(), modifier.sourceKey));
      if (excludedBy) notes.push(t(getLang(), "planetModifierExcluded")(t(getLang(), excludedBy.i18nKey)));
      if (box.checked && !planetModifierFitsBody(modifier)) notes.push(t(getLang(), "blockerInactive")(t(getLang(), "blockerWrongBody")));
      item.classList.toggle("is-inactive", box.checked && (!planetModifierFitsBody(modifier) || Boolean(excludedBy)));
      if (notes.length) {
        const small = document.createElement("small");
        small.textContent = notes.join(" · ");
        item.append(small);
      }
      list.append(item);
    });
    details.append(list);
    planetModifiersEl.append(details);
  });
}

// P17.1: botones "i" y paneles de explicación (js/info-panels.js).
initInfoButtons(() => getLang());
