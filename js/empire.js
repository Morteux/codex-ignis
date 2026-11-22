/**
 * Pestaña "Imperio": éticas (sistema de 3 puntos, mostradas como la rueda
 * de éticas del juego), autoridades (según tus éticas) y principios
 * (según tus éticas y autoridad).
 *
 * El idioma lo lleva el shell compartido (js/page-shell.js), que también
 * traduce las etiquetas estáticas con data-i18n de este panel; aquí solo
 * hace falta volver a pintar el contenido generado dinámicamente cuando
 * cambia el idioma (onLanguageChange) o la selección.
 *
 * Las éticas y la autoridad elegidas se publican en el estado compartido
 * (js/planet-state.js) para que planet-sim.js les aplique sus bonos a los
 * cálculos del planeta (ver collectAppliedEffects en empire-data.js).
 *
 * Perfiles de imperio guardados (P5): la pestaña puede guardarse con nombre
 * (js/empire-profiles.js) y cambiarse desde el desplegable de la barra de
 * resumen. Editar con un imperio seleccionado NO guarda solo: hace falta
 * pulsar Guardar (se indica con "cambios sin guardar").
 *
 * Ver js/empire-data.js para el origen de los datos y las simplificaciones.
 */

import { t } from "./i18n.js";
import "./i18n-simulator.js";
import "./i18n-empire-names.js";
import { getLang, onLanguageChange } from "./page-shell.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { PRINCIPLE_BINGO } from "./bingo-items.js";
import { updatePlanetState, emitEmpireSwitched, emitPoliciesReset, emitEdictsRemoved } from "./planet-state.js";
import { resolveEdicts } from "./edict-data.js";
import { renderEdictsList } from "./edicts-ui.js";
import { resolvePolicies, getPolicyOption, applicablePolicyGroups, policyAvailable, policyUnmetRules, policyDefaults, isGestaltContext } from "./policy-data.js";
import { getEmpire, createEmpire, updateEmpireConfig, renameEmpire, deleteEmpire, onEmpiresChange, configsEqual } from "./empire-profiles.js";
import { confirmChoice } from "./confirm-dialog.js";
import { createInfoPanel, syncInfoButtons, addInfoLine } from "./info-panels.js";
import { SPECIES_TYPES, allowedSpeciesTypes, RESOURCES, STRATUM_I18N_KEYS } from "./planet-data.js";
import {
  ETHICS_MAX_POINTS,
  ETHIC_AXES,
  GESTALT_CONSCIOUSNESS,
  ETHIC_OPTIONS,
  ETHIC_WHEEL,
  ETHIC_ICONS,
  ETHIC_EFFECTS,
  AUTHORITY_EFFECTS,
  AUTHORITIES,
  authorityAvailable,
  blockingEthics,
  ethicsComplete,
  MAX_CIVICS,
  civicAvailable,
  ORIGINS,
  originAvailable,
  civicExcludedByOrigin,
  authorityVariant
} from "./empire-data.js";

const pointsLabelEl = document.querySelector("#empire-points-label");
const wheelEl = document.querySelector("#empire-ethics-wheel");
const ethicsEffectsEl = document.querySelector("#empire-ethics-effects");
const authorityListEl = document.querySelector("#empire-authority-list");
const originListEl = document.querySelector("#empire-origin-list");
const speciesSelectEl = document.querySelector("#empire-species-select");
const civicsLabelEl = document.querySelector("#empire-civics-label");
const civicsListEl = document.querySelector("#empire-civics-list");
const policiesListEl = document.querySelector("#empire-policies-list");
const edictsListEl = document.querySelector("#empire-edicts-list");
const edictsCountEl = document.querySelector("#empire-edicts-count");
const profileNameEl = document.querySelector("#empire-profile-name");
const profileSaveNewBtn = document.querySelector("#empire-profile-save-new");
const profileSaveBtn = document.querySelector("#empire-profile-save");
const profileRenameBtn = document.querySelector("#empire-profile-rename");
const profileDeleteBtn = document.querySelector("#empire-profile-delete");
const profileStateEl = document.querySelector("#empire-profile-state");
const profileMessageEl = document.querySelector("#empire-profile-message");

let currentLang = getLang();

// Una opción elegida (o null) por cada eje de ETHIC_AXES.
const axisSelection = new Map(ETHIC_AXES.map((axis) => [axis.id, null]));
const axisOfOption = new Map(ETHIC_AXES.flatMap((axis) => axis.options.map((option) => [option.id, axis.id])));
let gestaltActive = false;
let selectedAuthorityId = null;
let selectedOriginId = null; // P10.6: ORIGINS id or null (no modelled origin)
const selectedCivics = new Set();
let selectedSpeciesType = "organic";
let selectedEmpireId = null; // imperio guardado seleccionado (null = borrador sin guardar)
// Políticas del imperio (P16): { grupo: idOpcion } solo con los grupos que aplican al tipo de imperio; siempre válidas
// (syncPolicies las normaliza en cada refresh). lastGestalt detecta el paso de imperio normal a gestalt y viceversa.
let selectedPolicies = {};
let lastGestalt = false;
// Edictos activos (P18): ids en el orden del catálogo, siempre disponibles para el imperio (syncEdicts los normaliza).
let selectedEdicts = [];

function currentEthicIds() {
  if (gestaltActive) return [GESTALT_CONSCIOUSNESS.id];
  return [...axisSelection.values()].filter(Boolean);
}

function pointsUsed() {
  if (gestaltActive) return GESTALT_CONSCIOUSNESS.cost;
  let total = 0;
  axisSelection.forEach((optionId) => {
    if (optionId) total += ETHIC_OPTIONS[optionId].cost;
  });
  return total;
}

function policyContext() {
  return { ethicIds: currentEthicIds(), authorityId: selectedAuthorityId, originId: selectedOriginId, civicIds: [...selectedCivics], speciesType: selectedSpeciesType };
}

/**
 * Mantiene las políticas válidas (P16.3). Si el imperio pasa de normal a gestalt (o al revés) se descartan todas y
 * vuelven los valores por defecto del nuevo tipo (Creación de riqueza / Política logística...), con aviso. Si no,
 * lo que deje de cumplir sus requisitos (p. ej. Ayuda mutua sin Cooperativa de trabajadores) se sustituye por
 * el valor por defecto de su grupo, también con aviso. Lo que falte simplemente se rellena sin avisar.
 */
function syncPolicies() {
  const ctx = policyContext();
  const gestalt = isGestaltContext(ctx);
  if (gestalt !== lastGestalt) {
    lastGestalt = gestalt;
    const hadChoices = Object.keys(selectedPolicies).length > 0;
    selectedPolicies = resolvePolicies({}, ctx).policyIds;
    if (hadChoices) emitPoliciesReset({ typeChange: true, gestalt, policyIds: { ...selectedPolicies }, changes: [] });
    return;
  }
  const { policyIds, changes } = resolvePolicies(selectedPolicies, ctx);
  selectedPolicies = policyIds;
  if (changes.length) emitPoliciesReset({ typeChange: false, gestalt, policyIds: { ...selectedPolicies }, changes });
}

/**
 * Mantiene los edictos válidos (P18.3): los que dejan de cumplir sus requisitos al cambiar éticas, autoridad o
 * principios se desactivan con aviso (no hay un edicto "por defecto" que los sustituya).
 */
function syncEdicts() {
  const { edictIds, removed } = resolveEdicts(selectedEdicts, policyContext());
  selectedEdicts = edictIds;
  if (removed.length) emitEdictsRemoved({ removed });
}

function toggleEdict(edictId) {
  const next = selectedEdicts.includes(edictId) ? selectedEdicts.filter((id) => id !== edictId) : [...selectedEdicts, edictId];
  selectedEdicts = resolveEdicts(next, policyContext()).edictIds;
  refresh();
}

function renderEdicts() {
  if (edictsCountEl) edictsCountEl.textContent = t(currentLang, "edictsActiveCount")(selectedEdicts.length);
  renderEdictsList(edictsListEl, {
    lang: currentLang,
    ctx: policyContext(),
    selected: new Set(selectedEdicts),
    onToggle: toggleEdict,
    describeRule: describePolicyRule
  });
}

/** Elige una opción de política desde la interfaz (P16.4). Devuelve false si el grupo no aplica o la opción no está disponible. */
function selectPolicy(groupId, optionId) {
  const ctx = policyContext();
  const group = applicablePolicyGroups(ctx).find((entry) => entry.id === groupId);
  const option = getPolicyOption(groupId, optionId);
  if (!group || !option || !policyAvailable(option, ctx)) return false;
  selectedPolicies = { ...selectedPolicies, [groupId]: optionId };
  refresh();
  return true;
}

function selectEthic(optionId) {
  if (optionId === GESTALT_CONSCIOUSNESS.id) {
    gestaltActive = !gestaltActive;
    if (gestaltActive) axisSelection.forEach((_, axisId) => axisSelection.set(axisId, null));
  } else {
    const axisId = axisOfOption.get(optionId);
    const current = axisSelection.get(axisId);
    if (current === optionId) {
      axisSelection.set(axisId, null);
    } else {
      const currentCost = current ? ETHIC_OPTIONS[current].cost : 0;
      if (pointsUsed() - currentCost + ETHIC_OPTIONS[optionId].cost > ETHICS_MAX_POINTS) return;
      axisSelection.set(axisId, optionId);
    }
  }
  onEthicsChanged();
}

/** Al cambiar de éticas, la autoridad y los principios elegidos pueden dejar de ser válidos. */
function onEthicsChanged() {
  if (selectedAuthorityId) {
    const authority = AUTHORITIES.find((a) => a.id === selectedAuthorityId);
    if (!authority || !authorityAvailable(authority, currentEthicIds())) selectedAuthorityId = null;
  }
  pruneUnavailableCivics();
  refresh();
}

function selectAuthority(authorityId) {
  selectedAuthorityId = selectedAuthorityId === authorityId ? null : authorityId;
  pruneUnavailableCivics();
  refresh();
}

function pruneUnavailableCivics() {
  // P10.6: an origin the authority no longer allows is dropped; the civics the origin excludes cannot be chosen while it is set.
  const origin = ORIGINS.find((entry) => entry.id === selectedOriginId);
  if (origin && !origin.authorities.includes(selectedAuthorityId)) selectedOriginId = null;
  const ethics = currentEthicIds();
  [...selectedCivics].forEach((key) => {
    if (!civicAvailable(key, ethics, selectedAuthorityId, [...selectedCivics]) || civicExcludedByOrigin(key, selectedOriginId)) selectedCivics.delete(key);
  });
}

function selectOrigin(originId) {
  selectedOriginId = selectedOriginId === originId ? null : originId;
  pruneUnavailableCivics();
  refresh();
}

function toggleCivic(i18nKey) {
  if (selectedCivics.has(i18nKey)) selectedCivics.delete(i18nKey);
  else if (selectedCivics.size < MAX_CIVICS) selectedCivics.add(i18nKey);
  refresh();
}

/** "+10%", "−20%", "+1", "−1" (con signo menos tipográfico). */
function formatEffectValue(effect) {
  const raw = effect.unit === "percent" ? Math.round(effect.value * 1000) / 10 : effect.value;
  const text = `${Math.abs(raw)}${effect.unit === "percent" ? "%" : ""}`;
  return `${raw < 0 ? "−" : "+"}${text}`;
}

/** Lista de efectos de una ética/autoridad; los que se aplican a los cálculos del planeta salen resaltados. */
function renderEffectList(effects) {
  const list = document.createElement("ul");
  list.className = "empire-effect-list";
  effects.forEach((effect) => {
    const item = document.createElement("li");
    item.className = effect.apply ? "is-applied" : "is-info";
    item.title = effect.apply ? "" : t(currentLang, "empireEffectNotApplied");
    const value = document.createElement("strong");
    value.textContent = formatEffectValue(effect);
    item.append(value, ` ${t(currentLang, `effect_${effect.label}`)}`);
    list.append(item);
  });
  return list;
}

function renderWheel() {
  if (!wheelEl) return;
  wheelEl.replaceChildren();
  const used = pointsUsed();
  const selectedIds = new Set(currentEthicIds());
  Object.entries(ETHIC_WHEEL).forEach(([optionId, [row, col]]) => {
    const option = ETHIC_OPTIONS[optionId];
    const isSelected = selectedIds.has(optionId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "empire-ethic-btn";
    btn.style.gridRow = String(row);
    btn.style.gridColumn = String(col);
    btn.classList.toggle("is-selected", isSelected);
    btn.classList.toggle("is-fanatic", option.cost === 2);

    let disabled;
    if (optionId === GESTALT_CONSCIOUSNESS.id) {
      disabled = !isSelected && used > 0;
    } else {
      const current = axisSelection.get(axisOfOption.get(optionId));
      const freeBudget = used - (current ? ETHIC_OPTIONS[current].cost : 0);
      disabled = gestaltActive || (!isSelected && freeBudget + option.cost > ETHICS_MAX_POINTS);
    }
    btn.disabled = disabled;

    const name = t(currentLang, option.i18nKey);
    btn.title = `${name} (${option.cost})`;
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-pressed", String(isSelected));

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${ETHIC_ICONS[optionId]}`;
    img.alt = "";
    img.loading = "lazy";
    btn.append(img);
    btn.addEventListener("click", () => selectEthic(optionId));
    wheelEl.append(btn);
  });
}

function renderEthicsEffects() {
  if (!ethicsEffectsEl) return;
  ethicsEffectsEl.replaceChildren();
  currentEthicIds().forEach((id) => {
    const block = document.createElement("div");
    block.className = "empire-effect-block";
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${ETHIC_ICONS[id]}`;
    img.alt = "";
    img.loading = "lazy";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = t(currentLang, ETHIC_OPTIONS[id].i18nKey);
    body.append(title, renderEffectList(ETHIC_EFFECTS[id] || []));
    block.append(img, body);
    ethicsEffectsEl.append(block);
  });
}

function lockReason(authority, ethics) {
  if (!ethicsComplete(ethics)) return t(currentLang, "empireSpendAllPoints");
  const isGestalt = ethics.includes(GESTALT_CONSCIOUSNESS.id);
  if (authority.gestalt !== isGestalt) {
    return t(currentLang, authority.gestalt ? "empireRequiresGestalt" : "empireNotWithGestalt");
  }
  const names = blockingEthics(authority, ethics).map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey));
  return t(currentLang, "empireBlockedBy") + names.join(", ");
}

function renderAuthorityList() {
  if (!authorityListEl) return;
  authorityListEl.replaceChildren();
  const ethics = currentEthicIds();
  AUTHORITIES.forEach((authority) => {
    const available = authorityAvailable(authority, ethics);
    const isSelected = selectedAuthorityId === authority.id;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-authority-card";
    card.classList.toggle("is-selected", isSelected);
    card.disabled = !available;

    // P10.6: a Wilderness Hive Mind is shown as the Mutualistic Intelligence (name, icon, text and effects).
    const shown = isSelected ? authorityVariant(authority.id, selectedOriginId) : authority;
    card.dataset.authorityId = authority.id;
    const header = document.createElement("div");
    header.className = "empire-authority-header";
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${shown.img}`;
    img.alt = "";
    img.loading = "lazy";
    const title = document.createElement("strong");
    title.textContent = t(currentLang, shown.i18nKey);
    header.append(img, title);
    card.append(header);

    const blurb = document.createElement("span");
    blurb.className = "empire-authority-blurb";
    blurb.textContent = t(currentLang, shown.blurbI18nKey);
    card.append(blurb);

    if (!available) {
      const lock = document.createElement("em");
      lock.className = "empire-authority-lock";
      lock.textContent = lockReason(authority, ethics);
      card.append(lock);
    } else if (isSelected) {
      card.append(renderEffectList(AUTHORITY_EFFECTS[shown.id] || []));
    }

    card.addEventListener("click", () => { if (available) selectAuthority(authority.id); });
    authorityListEl.append(card);
  });
}

/** P10.6: origin cards (only the modelled origins; none chosen = no modelled origin). */
function renderOriginList() {
  if (!originListEl) return;
  originListEl.replaceChildren();
  ORIGINS.forEach((origin) => {
    const available = originAvailable(origin, selectedAuthorityId, [...selectedCivics]);
    const isSelected = selectedOriginId === origin.id;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-authority-card";
    card.dataset.originId = origin.id;
    card.classList.toggle("is-selected", isSelected);
    card.disabled = !available && !isSelected;
    const header = document.createElement("div");
    header.className = "empire-authority-header";
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${origin.img}`;
    img.alt = "";
    img.loading = "lazy";
    const title = document.createElement("strong");
    title.textContent = t(currentLang, origin.i18nKey);
    header.append(img, title);
    const blurb = document.createElement("span");
    blurb.className = "empire-authority-blurb";
    blurb.textContent = t(currentLang, origin.blurbI18nKey);
    card.append(header, blurb);
    if (!available && !isSelected) {
      const lock = document.createElement("em");
      lock.className = "empire-authority-lock";
      const blocking = origin.excludedCivics.filter((key) => selectedCivics.has(key)).map((key) => t(currentLang, key));
      lock.textContent = !origin.authorities.includes(selectedAuthorityId)
        ? t(currentLang, "empireOriginRequiresAuthority") + origin.authorities.map((id) => t(currentLang, AUTHORITIES.find((a) => a.id === id).i18nKey)).join(", ")
        : t(currentLang, "empireBlockedBy") + blocking.join(", ");
      card.append(lock);
    }
    card.addEventListener("click", () => { if (available || isSelected) selectOrigin(origin.id); });
    originListEl.append(card);
  });
}

/**
 * Tipo de especie: solo cambia el mantenimiento de los empleos de conciencia
 * gestalt. Una Inteligencia de Máquina solo puede ser especie máquina y una
 * Mente Colmena no puede serlo (ver allowedSpeciesTypes en planet-data.js).
 */
function renderSpeciesSelect() {
  if (!speciesSelectEl) return;
  const allowed = allowedSpeciesTypes(selectedAuthorityId);
  if (!allowed.includes(selectedSpeciesType)) selectedSpeciesType = allowed[0];
  speciesSelectEl.replaceChildren();
  SPECIES_TYPES.filter((type) => allowed.includes(type.id)).forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = t(currentLang, type.i18nKey);
    speciesSelectEl.append(option);
  });
  speciesSelectEl.value = selectedSpeciesType;
}

if (speciesSelectEl) {
  speciesSelectEl.addEventListener("change", () => {
    selectedSpeciesType = speciesSelectEl.value;
    refresh();
  });
}

/** Texto corto de una regla de requisito de política no cumplida (P16.4). */
function describePolicyRule(rule) {
  const names = (list) => list.join(", ");
  const authorityNames = (ids) => ids.map((id) => t(currentLang, AUTHORITIES.find((a) => a.id === id).i18nKey));
  switch (rule.type) {
    case "federation": return t(currentLang, "requirementFederation");
    case "notGestalt": return t(currentLang, "requirementNotGestalt");
    case "usesConsumerGoods": return t(currentLang, "requirementUsesConsumerGoods");
    case "ethic": return t(currentLang, "requirementEthic") + names(rule.ids.map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey)));
    case "authority": return t(currentLang, "requirementAuthority") + names(authorityNames(rule.ids));
    case "notAuthority": return t(currentLang, "requirementNotAuthority") + names(authorityNames(rule.ids));
    case "civic": return t(currentLang, "requirementCivic") + names(rule.keys.map((key) => t(currentLang, key)));
    case "notCivic": return t(currentLang, "requirementNotCivic") + names(rule.keys.map((key) => t(currentLang, key)));
    case "anyOf": return t(currentLang, "requirementAnyOf") + rule.rules.map((inner) => {
      if (inner.type === "authority") return names(authorityNames(inner.ids));
      if (inner.type === "civic") return names(inner.keys.map((key) => t(currentLang, key)));
      return describePolicyRule(inner);
    }).join(" / ");
    default: return "";
  }
}

const percentText = (fraction) => `${Math.round(Math.abs(fraction) * 10000) / 100}%`;
const signedPercentText = (fraction) => `${fraction < 0 ? "−" : "+"}${percentText(fraction)}`;
const resourceLabel = (resourceId) => t(currentLang, RESOURCES[resourceId].i18nKey);

/** Líneas de efecto de una opción de política (P16.4), tal como las da la wiki: tasas de cambio, % de empleos, % por estrato, % mensual. */
function policyEffectLines(option) {
  const effects = option.effects || {};
  const lines = [];
  if (effects.tradeConversion) {
    lines.push(t(currentLang, "policyEffectTradeConversion") + Object.entries(effects.tradeConversion).map(([resourceId, rate]) => `${percentText(rate)} ${resourceLabel(resourceId)}`).join(" · "));
  }
  Object.entries(effects.jobResourceMult || {}).forEach(([resourceId, fraction]) => lines.push(t(currentLang, "policyEffectJobResource")(signedPercentText(fraction), resourceLabel(resourceId))));
  Object.entries(effects.stratumOutput || {}).forEach(([stratum, fraction]) => lines.push(t(currentLang, "policyEffectStratum")(signedPercentText(fraction), t(currentLang, STRATUM_I18N_KEYS[stratum]))));
  Object.entries(effects.resourceMult || {}).forEach(([resourceId, fraction]) => lines.push(t(currentLang, "policyEffectMonthly")(signedPercentText(fraction), resourceLabel(resourceId))));
  if (!lines.length) lines.push(t(currentLang, "policyEffectNone"));
  return lines;
}

/** Panel "Políticas" (P16.4): un grupo por política que aplica al tipo de imperio, una opción elegida por grupo. */
function renderPoliciesList() {
  if (!policiesListEl) return;
  policiesListEl.replaceChildren();
  const ctx = policyContext();
  const gestalt = isGestaltContext(ctx);
  const defaults = policyDefaults(ctx);
  applicablePolicyGroups(ctx).forEach((group) => {
    const section = document.createElement("div");
    section.className = "empire-policy-group";
    const title = document.createElement("h3");
    title.className = "entry-heading-subsub";
    title.textContent = t(currentLang, gestalt && group.gestaltI18nKey ? group.gestaltI18nKey : group.i18nKey);
    const note = document.createElement("p");
    note.className = "empire-note";
    note.textContent = t(currentLang, `policyGroupNote_${group.id}`);
    const grid = document.createElement("div");
    grid.className = "empire-policy-grid";
    group.options.forEach((option) => {
      const available = policyAvailable(option, ctx);
      const isSelected = selectedPolicies[group.id] === option.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "empire-authority-card empire-policy-card";
      card.classList.toggle("is-selected", isSelected);
      card.disabled = !available;
      card.setAttribute("aria-pressed", String(isSelected));
      const header = document.createElement("div");
      header.className = "empire-authority-header";
      const name = document.createElement("strong");
      name.textContent = t(currentLang, option.i18nKey);
      header.append(name);
      if (defaults[group.id] === option.id) {
        const badge = document.createElement("span");
        badge.className = "library-badge";
        badge.textContent = t(currentLang, "policyDefaultBadge");
        header.append(badge);
      }
      card.append(header);
      const effects = document.createElement("ul");
      effects.className = "empire-effect-list";
      policyEffectLines(option).forEach((line) => {
        const item = document.createElement("li");
        item.className = "is-info";
        item.textContent = line;
        effects.append(item);
      });
      card.append(effects);
      if (option.federationNoteKey) {
        const fed = document.createElement("p");
        fed.className = "empire-policy-federation-note";
        fed.textContent = t(currentLang, option.federationNoteKey);
        card.append(fed);
      }
      if (!available) {
        const lock = document.createElement("em");
        lock.className = "empire-authority-lock";
        lock.textContent = policyUnmetRules(option, ctx).map(describePolicyRule).filter(Boolean).join("; ");
        card.append(lock);
      }
      card.addEventListener("click", () => { if (available) selectPolicy(group.id, option.id); });
      grid.append(card);
    });
    section.append(title, note, grid);
    policiesListEl.append(section);
  });
}

function renderCivicsList() {
  if (civicsLabelEl) civicsLabelEl.textContent = t(currentLang, "empireCivicsSlotsLabel")(selectedCivics.size, MAX_CIVICS);
  if (!civicsListEl) return;
  civicsListEl.replaceChildren();

  const note = (key) => {
    const p = document.createElement("p");
    p.className = "empire-note";
    p.textContent = t(currentLang, key);
    civicsListEl.append(p);
  };

  if (!selectedAuthorityId) return note("empireChooseAuthorityFirst");

  const ethics = currentEthicIds();
  const chosen = [...selectedCivics];
  const available = PRINCIPLE_BINGO.filter((entry) => civicAvailable(entry.i18nKey, ethics, selectedAuthorityId, chosen) && !civicExcludedByOrigin(entry.i18nKey, selectedOriginId));
  if (!available.length) return note("empireCivicsEmpty");

  const atLimit = selectedCivics.size >= MAX_CIVICS;
  available.forEach((entry) => {
    const isSelected = selectedCivics.has(entry.i18nKey);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-civic-card";
    card.classList.toggle("is-selected", isSelected);
    card.disabled = !isSelected && atLimit;
    card.title = !isSelected && atLimit ? t(currentLang, "empireCivicsLimitReached") : "";

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${entry.img}`;
    img.alt = "";
    img.loading = "lazy";
    const name = document.createElement("span");
    name.textContent = t(currentLang, entry.i18nKey);
    card.append(img, name);
    card.addEventListener("click", () => toggleCivic(entry.i18nKey));
    civicsListEl.append(card);
  });
}

/**
 * P13.7: id del último imperio guardado seleccionado, para restaurarlo al
 * recargar (si sigue existiendo). null = borrador sin guardar.
 */
const LAST_EMPIRE_KEY = "codex-ignis-last-empire";
function storeLastEmpire(id) {
  try {
    if (id) window.localStorage.setItem(LAST_EMPIRE_KEY, id);
    else window.localStorage.removeItem(LAST_EMPIRE_KEY);
  } catch (error) {
    // Sin almacenamiento: la selección solo dura la visita.
  }
}
function readLastEmpire() {
  try {
    return window.localStorage.getItem(LAST_EMPIRE_KEY);
  } catch (error) {
    return null;
  }
}

let lastPublishedKey = null;
/** Publica éticas, autoridad, principios e imperio seleccionado en el estado compartido (solo si cambian) para que planet-sim.js y la barra de resumen los usen. */
function publishSelection() {
  const ethicIds = currentEthicIds();
  const civicIds = [...selectedCivics];
  const modified = isModified();
  const policyKey = Object.entries(selectedPolicies).sort().map(([group, option]) => `${group}:${option}`).join(",");
  const key = `${ethicIds.join(",")}|${selectedAuthorityId}|${selectedOriginId}|${[...civicIds].sort().join(",")}|${selectedSpeciesType}|${selectedEmpireId}|${modified}|${policyKey}|${selectedEdicts.join(",")}`;
  if (key === lastPublishedKey) return;
  lastPublishedKey = key;
  storeLastEmpire(selectedEmpireId);
  updatePlanetState({ ethicIds, authorityId: selectedAuthorityId, originId: selectedOriginId, civicIds, speciesType: selectedSpeciesType, policyIds: { ...selectedPolicies }, edictIds: [...selectedEdicts], empireId: selectedEmpireId, empireModified: modified });
}

/** P17.5: paneles "i" de la pestaña Imperio (efectos aplicados/informativos, límites de principios, políticas y conversión de comercio). */
function renderEmpireInfo() {
  syncInfoButtons(currentLang);
  const fill = (id, build) => {
    const slot = document.querySelector(`#${id}-info-slot`);
    if (!slot) return;
    const panel = createInfoPanel(id);
    build(panel);
    slot.replaceChildren(panel);
  };
  fill("empire-ethics", (panel) => {
    addInfoLine(panel, t(currentLang, "empireInfoEthics"));
    const applied = [];
    currentEthicIds().forEach((id) => (ETHIC_EFFECTS[id] || []).filter((e) => e.apply)
      .forEach((e) => applied.push(`${formatEffectValue(e)} ${t(currentLang, `effect_${e.label}`)} (${t(currentLang, ETHIC_OPTIONS[id].i18nKey)})`)));
    const authority = authorityVariant(selectedAuthorityId, selectedOriginId);
    if (authority) (AUTHORITY_EFFECTS[authority.id] || []).filter((e) => e.apply)
      .forEach((e) => applied.push(`${formatEffectValue(e)} ${t(currentLang, `effect_${e.label}`)} (${t(currentLang, authority.i18nKey)})`));
    addInfoLine(panel, applied.length ? t(currentLang, "empireInfoNowApplied")(applied.join(" · ")) : t(currentLang, "empireInfoNowAppliedNone"), true);
  });
  fill("empire-civics", (panel) => addInfoLine(panel, t(currentLang, "empireInfoCivics")(selectedCivics.size, MAX_CIVICS)));
  fill("empire-policies", (panel) => {
    addInfoLine(panel, t(currentLang, "empireInfoPolicies"));
    const optionId = selectedPolicies.trade;
    const option = optionId && getPolicyOption("trade", optionId);
    const rates = option && option.effects && option.effects.tradeConversion;
    if (!rates) return;
    const pct = (rate) => Math.round(rate * 10000) / 100;
    const rest = Object.entries(rates).filter(([id, rate]) => id !== "trade" && rate)
      .map(([id, rate]) => `${pct(rate)}% ${t(currentLang, RESOURCES[id].i18nKey)}`).join(" · ");
    addInfoLine(panel, t(currentLang, "empireInfoNowTrade")(t(currentLang, option.i18nKey), pct(rates.trade ?? 0), rest), true);
  });
}

function refresh() {
  syncPolicies();
  syncEdicts();
  renderEmpireInfo();
  if (pointsLabelEl) pointsLabelEl.textContent = t(currentLang, "empirePointsLabel")(pointsUsed(), ETHICS_MAX_POINTS);
  renderWheel();
  renderEthicsEffects();
  renderAuthorityList();
  renderOriginList();
  renderSpeciesSelect();
  renderCivicsList();
  renderPoliciesList();
  renderEdicts();
  renderProfilePanel();
  publishSelection();
}

/* ── Perfiles de imperio guardados (P5) ─────────────────────────────── */

/** Configuración actual de la pestaña Imperio, con la misma forma que un perfil guardado. */
function currentConfig() {
  return { ethicIds: currentEthicIds(), authorityId: selectedAuthorityId, originId: selectedOriginId, civicIds: [...selectedCivics], speciesType: selectedSpeciesType, policyIds: { ...selectedPolicies }, edictIds: [...selectedEdicts] };
}

/** ¿Hay un imperio guardado seleccionado y la pestaña ya no coincide con lo guardado? (sin imperio seleccionado no hay "cambios sin guardar": es un borrador) */
function isModified() {
  if (!selectedEmpireId) return false;
  const profile = getEmpire(selectedEmpireId);
  return Boolean(profile) && !configsEqual(profile, currentConfig());
}

/** Vuelca un perfil guardado en la pestaña Imperio. Ignora (no inventa) lo que ya no sea válido, p. ej. un principio incompatible. */
function applyConfig(config) {
  axisSelection.forEach((_, axisId) => axisSelection.set(axisId, null));
  gestaltActive = false;
  const ethicIds = (config.ethicIds || []).filter((id) => ETHIC_OPTIONS[id]);
  if (ethicIds.includes(GESTALT_CONSCIOUSNESS.id)) {
    gestaltActive = true;
  } else {
    let used = 0;
    ethicIds.forEach((id) => {
      const axisId = axisOfOption.get(id);
      if (!axisId || axisSelection.get(axisId)) return;
      const cost = ETHIC_OPTIONS[id].cost;
      if (used + cost > ETHICS_MAX_POINTS) return;
      axisSelection.set(axisId, id);
      used += cost;
    });
  }
  const authority = AUTHORITIES.find((entry) => entry.id === config.authorityId);
  selectedAuthorityId = authority && authorityAvailable(authority, currentEthicIds()) ? authority.id : null;
  // P10.6: an unknown origin or one the authority does not allow is dropped (older profiles: none).
  const origin = ORIGINS.find((entry) => entry.id === config.originId);
  selectedOriginId = origin && origin.authorities.includes(selectedAuthorityId) ? origin.id : null;
  selectedCivics.clear();
  (config.civicIds || []).forEach((key) => {
    if (selectedCivics.size >= MAX_CIVICS) return;
    if (civicAvailable(key, currentEthicIds(), selectedAuthorityId, [...selectedCivics, key]) && !civicExcludedByOrigin(key, selectedOriginId)) selectedCivics.add(key);
  });
  pruneUnavailableCivics();
  selectedSpeciesType = SPECIES_TYPES.some((type) => type.id === config.speciesType) ? config.speciesType : "organic";
  // Políticas del perfil (P16.4/P16.5): lo que falte (perfiles antiguos) o ya no sea válido se sustituye por el valor por defecto, sin aviso.
  const appliedContext = policyContext();
  selectedPolicies = resolvePolicies(config.policyIds, appliedContext).policyIds;
  lastGestalt = isGestaltContext(appliedContext);
  // Edictos del perfil (P18.3): lo desconocido o no disponible se descarta sin aviso (perfiles anteriores a P18: ninguno).
  selectedEdicts = resolveEdicts(config.edictIds, appliedContext).edictIds;
}

let messageTimer = null;
/** Mensaje breve de resultado de una acción de perfil (se borra solo a los 6 s). */
function showProfileMessage(text) {
  if (!profileMessageEl) return;
  profileMessageEl.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { profileMessageEl.textContent = ""; }, 6000);
}

function reportResult(result, successKey) {
  if (!result.ok) {
    showProfileMessage(t(currentLang, { empty: "empireProfileErrorEmpty", duplicate: "empireProfileErrorDuplicate", notFound: "empireProfileErrorNotFound" }[result.error]));
    return false;
  }
  const base = t(currentLang, successKey)(result.profile.name);
  showProfileMessage(result.persisted ? base : `${base} ${t(currentLang, "empireProfileWarnNotPersisted")}`);
  return true;
}

let lastSyncedEmpireId;
function renderProfilePanel() {
  const profile = selectedEmpireId ? getEmpire(selectedEmpireId) : null;
  // El campo de nombre solo se rellena al cambiar de imperio seleccionado, para no pisar lo que el usuario esté escribiendo.
  if (lastSyncedEmpireId !== selectedEmpireId) {
    lastSyncedEmpireId = selectedEmpireId;
    if (profileNameEl) profileNameEl.value = profile ? profile.name : "";
  }
  const modified = isModified();
  if (profileStateEl) {
    profileStateEl.textContent = !profile
      ? t(currentLang, "empireProfileStateDraft")
      : t(currentLang, modified ? "empireProfileStateModified" : "empireProfileStateSaved")(profile.name);
    profileStateEl.classList.toggle("is-modified", modified);
  }
  if (profileSaveBtn) profileSaveBtn.disabled = !(profile && modified);
  if (profileRenameBtn) profileRenameBtn.disabled = !profile;
  if (profileDeleteBtn) profileDeleteBtn.disabled = !profile;
}

/**
 * Si hay un imperio seleccionado con cambios sin guardar, pregunta qué hacer
 * (Guardar / No guardar / Cancelar). Devuelve true si se puede continuar
 * (guardado o descartado) y false si el usuario cancela. Reutilizable al
 * cargar un planeta (P6).
 */
export async function resolveUnsavedEmpireChanges() {
  if (!isModified()) return true;
  const profile = getEmpire(selectedEmpireId);
  const choice = await confirmChoice({
    title: t(currentLang, "empireUnsavedTitle"),
    message: t(currentLang, "empireUnsavedMessage")(profile.name),
    buttons: [
      { id: "save", label: t(currentLang, "empireUnsavedSave"), variant: "primary" },
      { id: "discard", label: t(currentLang, "empireUnsavedDiscard") },
      { id: "cancel", label: t(currentLang, "empireDialogCancel") }
    ],
    cancelId: "cancel"
  });
  if (choice === "save") {
    updateEmpireConfig(selectedEmpireId, currentConfig());
    return true;
  }
  return choice === "discard";
}

/**
 * Cambia de imperio guardado (null = dejar la configuración actual como
 * borrador sin guardar). Con cambios sin guardar pide confirmación; al
 * aplicar otro imperio, planet-sim.js avisa de los edificios que quedan
 * inactivos por requisitos, sin borrarlos (ver emitEmpireSwitched). Cambiar a "ninguno" no
 * toca la configuración ni los edificios, así que no pide confirmación.
 */
export async function requestSwitchEmpire(targetId) {
  const target = targetId ? getEmpire(targetId) : null;
  if (targetId && !target) { refresh(); return; }
  if ((target ? target.id : null) === selectedEmpireId) return;
  if (target && !(await resolveUnsavedEmpireChanges())) { refresh(); return; }
  selectedEmpireId = target ? target.id : null;
  if (target) applyConfig(target);
  refresh();
  if (target) emitEmpireSwitched({ empireId: target.id, name: target.name });
}

/**
 * Aplica el imperio de un planeta que se está cargando de la biblioteca (P6).
 * Si el imperio guardado sigue existiendo se usa su versión ACTUAL; si ya no
 * existe (o el planeta se guardó con un borrador), se aplica la copia en bruto
 * del planeta (`snapshot`) como borrador sin guardar. Con cambios sin guardar
 * en el imperio actual pide confirmación (Guardar / No guardar / Cancelar).
 * Devuelve false si el usuario cancela. No emite el aviso de cambio de imperio:
 * quien carga el planeta informa de los edificios inactivos.
 */
export async function loadPlanetEmpire(empireId, snapshot) {
  if (!(await resolveUnsavedEmpireChanges())) return false;
  const target = empireId ? getEmpire(empireId) : null;
  if (target) {
    selectedEmpireId = target.id;
    applyConfig(target);
  } else {
    selectedEmpireId = null;
    if (snapshot) applyConfig(snapshot);
  }
  refresh();
  return true;
}

if (profileSaveNewBtn) {
  profileSaveNewBtn.addEventListener("click", () => {
    const result = createEmpire(profileNameEl ? profileNameEl.value : "", currentConfig());
    if (!reportResult(result, "empireProfileMsgCreated")) return;
    selectedEmpireId = result.profile.id;
    refresh();
  });
}

if (profileSaveBtn) {
  profileSaveBtn.addEventListener("click", () => {
    if (!selectedEmpireId) return;
    reportResult(updateEmpireConfig(selectedEmpireId, currentConfig()), "empireProfileMsgSaved");
  });
}

if (profileRenameBtn) {
  profileRenameBtn.addEventListener("click", () => {
    if (!selectedEmpireId) return;
    reportResult(renameEmpire(selectedEmpireId, profileNameEl ? profileNameEl.value : ""), "empireProfileMsgRenamed");
  });
}

if (profileDeleteBtn) {
  profileDeleteBtn.addEventListener("click", async () => {
    const profile = selectedEmpireId ? getEmpire(selectedEmpireId) : null;
    if (!profile) return;
    const choice = await confirmChoice({
      title: t(currentLang, "empireDeleteTitle"),
      message: t(currentLang, "empireDeleteMessage")(profile.name),
      buttons: [
        { id: "delete", label: t(currentLang, "empireDeleteConfirm"), variant: "danger" },
        { id: "cancel", label: t(currentLang, "empireDialogCancel") }
      ],
      cancelId: "cancel"
    });
    if (choice === "delete") reportResult(deleteEmpire(profile.id), "empireProfileMsgDeleted");
  });
}

// Si el imperio seleccionado desaparece de la lista, la configuración actual se conserva como borrador.
onEmpiresChange(() => {
  if (selectedEmpireId && !getEmpire(selectedEmpireId)) selectedEmpireId = null;
  refresh();
});

onLanguageChange((lang) => {
  currentLang = lang;
  refresh();
});

// P13.7: al recargar se restaura el último imperio seleccionado si sigue existiendo.
{
  const lastEmpire = getEmpire(readLastEmpire());
  if (lastEmpire) {
    selectedEmpireId = lastEmpire.id;
    applyConfig(lastEmpire);
  }
}
refresh();
