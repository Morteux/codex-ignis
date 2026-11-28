/**
 * Planet simulator, Planet tab: job rows (staffing sliders, swap notes, unapplied swaps),
 * jobs counter and the non-resource effects of jobs.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { JOBS, JOB_OUTPUTS, JOB_EFFECTS, JOB_STRATA, STRATUM_I18N_KEYS, STAT_EFFECTS, divideEffect } from "./planet-data.js";
import { stackedSwapChanges, swapWeight, swapRuleMet, blockedByUnmodelled, unmodelledSwapRules, SWAP_BASES, MODELLED_SWAPS } from "./job-swaps.js";
import { JOB_SWAPS_BY_ID } from "./job-swap-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { updatePlanetState } from "./planet-state.js";
import { createInfoPanel, syncInfoButtons } from "./info-panels.js";
import { refreshEconomyOnly } from "./planet-sim-production-ui.js";
import { currentCapital } from "./planet-sim-rules.js";
import { jobAssignments } from "./planet-sim-state.js";
import { describeSwapRule, jobName, zoneDisplayName, formatAmount, displayAmount, resourceName, jobIcon, resourceIcon } from "./planet-sim-text.js";

const summaryPopulationEl = document.querySelector("#planet-jobs-counter");

const nonResourceEl = document.querySelector("#planet-nonresource");

/** P21.4: "Replaces <base> · weight · conditions" and the stacked changes of a swapped job row. */
function renderSwapNote(jobId, swapInfo) {
  const swap = JOB_SWAPS_BY_ID.get(jobId);
  if (!swap || !swapInfo) return null;
  const base = Object.keys(swapInfo.applied).find((key) => swapInfo.applied[key] === jobId);
  const stacked = stackedSwapChanges(jobId, swapInfo.context);
  if (!base && !stacked.length) return null;
  const note = document.createElement("div");
  note.className = "planet-job-swap-note";
  if (base) {
    const line = document.createElement("span");
    // Of an "one of" condition only the met alternatives are shown.
    const reasons = (swap.requires || []).map((rule) => (rule.type === "anyOf"
      ? rule.rules.filter((inner) => swapRuleMet(inner, swapInfo.context)).map(describeSwapRule).join(" / ")
      : describeSwapRule(rule))).filter(Boolean);
    line.textContent = [t(getLang(), "jobSwapReplaces").replace("{job}", jobName(base)), t(getLang(), "jobSwapWeight").replace("{n}", String(swapWeight(swap, swapInfo.context))), ...reasons].join(" · ");
    note.append(line);
  }
  if (stacked.length) {
    const line = document.createElement("span");
    line.textContent = t(getLang(), "jobSwapStacked") + stacked.map((change) => {
      const label = change.kind === "zone" ? zoneDisplayName(change.id) : t(getLang(), "modifierSourceJobSwap").replace("{job}", JOBS[change.id] ? jobName(change.id) : change.id);
      const parts = [...Object.entries(change.output).map(([resourceId, amount]) => `${formatAmount(displayAmount(resourceId, amount), true)} ${resourceName(resourceId)}`),
        ...Object.entries(change.effects).map(([stat, amount]) => `${formatAmount(amount, true)} ${t(getLang(), STAT_EFFECTS[stat]?.i18nKey || stat)}`)];
      return `${label} (${parts.join(", ")})`;
    }).join("; ");
    note.append(line);
  }
  return note;
}

/** P21.4: swaps of the planet's base jobs that the simulator cannot apply because a condition is not modelled. */
export function renderUnappliedSwaps(swapInfo) {
  if (!swapInfo) return null;
  const bases = new Set(swapInfo.baseJobIds);
  const entries = MODELLED_SWAPS.filter((swap) => SWAP_BASES[swap.id].some((base) => bases.has(base)) && blockedByUnmodelled(swap, swapInfo.context));
  if (!entries.length) return null;
  const box = document.createElement("details");
  box.className = "planet-job-swaps-unapplied";
  const summary = document.createElement("summary");
  summary.textContent = `${t(getLang(), "jobSwapsNotAppliedTitle")} (${entries.length})`;
  box.append(summary);
  const list = document.createElement("ul");
  entries.forEach((swap) => {
    const item = document.createElement("li");
    const base = SWAP_BASES[swap.id].find((id) => bases.has(id));
    const missing = [...new Set(unmodelledSwapRules(swap.requires || [], swapInfo.context).map((rule) => t(getLang(), rule.i18nKey)))];
    item.textContent = `${jobName(base)} → ${jobName(swap.id)}: ${t(getLang(), "requirementUnmodelled")}${missing.join(" / ")}`;
    list.append(item);
  });
  box.append(list);
  return box;
}

/**
 * Fila de un empleo en el resumen: icono+nombre+empleos creados a la
 * izquierda, slider de dotación en el medio, empleos cubiertos y recursos
 * que aporta a la derecha. Plantilla completa asumida (decisión del GDD):
 * por defecto TODOS los empleos creados están cubiertos (100 %); el slider
 * es solo un ajuste opcional (override) para reducir la dotación.
 * `capacity` y `jobAssignments[jobId]` están en la escala ×100 de los
 * datos de origen (no en pops reales): así el slider de paso 10 tiene
 * recorrido real. Los recursos de la derecha SÍ se muestran ya convertidos
 * a unidades reales (única división, con divideEffect, al calcularlos).
 */
export function renderJobSliderRow(jobId, capacity, unitOutputs, swapInfo) {
  const assigned = jobAssignments[jobId] || 0;

  const row = document.createElement("div");
  row.className = "planet-job-row";

  const info = document.createElement("div");
  info.className = "planet-job-row-info";
  info.append(jobIcon(jobId));
  const label = document.createElement("span");
  label.textContent = `${jobName(jobId)} · ${t(getLang(), "planetSimJobCreatedLabel")(formatAmount(capacity))}`;
  info.append(label);
  row.append(info);
  const swapNote = renderSwapNote(jobId, swapInfo);
  if (swapNote) row.append(swapNote);

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-job-step-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.title = t(getLang(), "planetSimJobStepTooltip");
  decreaseBtn.setAttribute("aria-label", t(getLang(), "a11yJobStepDown")(jobName(jobId)));

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "planet-job-slider";
  slider.min = "0";
  slider.max = String(capacity);
  slider.step = "10";
  slider.value = String(assigned);
  slider.setAttribute("aria-label", `${jobName(jobId)} — ${t(getLang(), "planetSimJobStaffedLabel")}`);
  slider.title = t(getLang(), "planetSimJobOverrideHint");

  const increaseBtn = document.createElement("button");
  increaseBtn.type = "button";
  increaseBtn.className = "planet-job-step-btn";
  increaseBtn.textContent = "+";
  increaseBtn.title = t(getLang(), "planetSimJobStepTooltip");
  increaseBtn.setAttribute("aria-label", t(getLang(), "a11yJobStepUp")(jobName(jobId)));

  const valueLabel = document.createElement("span");
  valueLabel.className = "planet-job-row-value";
  valueLabel.title = t(getLang(), "planetSimJobStaffedLabel");

  const output = document.createElement("div");
  output.className = "planet-job-row-output";

  /** Repinta solo el valor y los recursos de ESTA fila (sin tocar el slider ni recrearlo), a partir de la dotación recién asignada. */
  function updateRowDisplay(newAssigned) {
    // Los empleos y la población que los ocupa se muestran en escala ×100, como en la wiki.
    valueLabel.textContent = formatAmount(newAssigned);
    row.classList.toggle("is-override", newAssigned < capacity);
    output.replaceChildren();
    // unitOutputs ya incluye los bonos de edificios y la eficacia de la designación.
    Object.entries(unitOutputs || JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, perJob]) => {
      const amount = perJob * divideEffect(newAssigned);
      if (Math.abs(amount) < 0.001) return;
      const pill = document.createElement("span");
      pill.className = `planet-job-output-pill ${amount < 0 ? "is-negative" : "is-positive"}`;
      pill.append(resourceIcon(resourceId));
      const amountLabel = document.createElement("span");
      amountLabel.textContent = formatAmount(displayAmount(resourceId, amount), true);
      pill.append(amountLabel);
      output.append(pill);
    });
    effectPills(jobId, newAssigned, false).forEach((pill) => output.append(pill));
  }
  updateRowDisplay(assigned);

  /** Aplica un nuevo valor de dotación (empleos cubiertos): guarda el estado, repinta esta fila en el sitio y refresca el resto de la economía sin recrear ningún slider (para no interrumpir el arrastre). */
  function commitChange(newValue) {
    const clamped = Math.max(0, Math.min(capacity, newValue));
    jobAssignments[jobId] = clamped;
    slider.value = String(clamped);
    updateRowDisplay(clamped);
    refreshEconomyOnly();
  }

  // "input" (no "change"): se quiere ver el resultado en vivo mientras se
  // arrastra. Como commitChange() no recrea el propio slider (solo llama a
  // refreshEconomyOnly(), que no toca #planet-summary), el arrastre no se
  // interrumpe.
  slider.addEventListener("input", () => {
    commitChange(Number(slider.value));
  });

  // Clic: ±10 · Ctrl/Cmd+clic: ±100 · Mayús+clic: sube al 100 % (+) o baja al 0 % (−).
  function stepFor(event, direction) {
    const current = jobAssignments[jobId] || 0;
    if (event.shiftKey) return direction > 0 ? capacity : 0;
    return current + direction * ((event.ctrlKey || event.metaKey) ? 100 : 10);
  }
  decreaseBtn.addEventListener("click", (event) => commitChange(stepFor(event, -1)));
  increaseBtn.addEventListener("click", (event) => commitChange(stepFor(event, 1)));

  row.append(decreaseBtn, slider, increaseBtn, valueLabel, output);

  return row;
}

export function renderJobsMini(jobs) {
  const entries = Object.entries(jobs).filter(([, raw]) => raw > 0);
  const wrapper = document.createElement("span");
  wrapper.className = "planet-catalog-jobs";
  entries.forEach(([jobId, raw]) => {
    const pill = document.createElement("span");
    pill.className = "planet-catalog-job-pill";
    pill.title = `+${formatAmount(raw)} ${jobName(jobId)}`;
    pill.append(jobIcon(jobId));
    const label = document.createElement("span");
    label.textContent = formatAmount(raw);
    pill.append(label);
    wrapper.append(pill);
  });
  return wrapper;
}

/* ── Paneles de resumen y producción ─────────────────────────────────── */

/** Contador "empleos creados / empleos asumidos cubiertos" (escala ×100, como los datos de la wiki). */
export function updateJobsCounter(jobIds, jobCapacities) {
  const created = jobIds.reduce((sum, jobId) => sum + (jobCapacities[jobId] || 0), 0);
  const staffed = jobIds.reduce((sum, jobId) => sum + (jobAssignments[jobId] || 0), 0);
  const createdText = formatAmount(created);
  const staffedText = formatAmount(staffed);
  if (summaryPopulationEl) {
    summaryPopulationEl.textContent = t(getLang(), "planetSimJobsCounter")(createdText, staffedText);
  }
  updatePlanetState({ populationText: staffedText });
}

/** Píldoras con los efectos de JOB_EFFECTS de un empleo (estabilidad, delincuencia...), multiplicados por los empleos cubiertos (escala ×100). withLabel: añade el nombre de la estadística. */
/** Píldora de una estadística sin recurso (estabilidad, delincuencia, ejércitos de defensa...) con su signo y color. */
function statPill(statId, amount, withLabel) {
  const stat = STAT_EFFECTS[statId];
  const pill = document.createElement("span");
  // Para delincuencia, menos es mejor: se pinta en verde cuando baja.
  const good = statId === "crime" ? amount < 0 : amount > 0;
  pill.className = `planet-job-output-pill ${good ? "is-positive" : "is-negative"}`;
  pill.title = t(getLang(), stat.i18nKey);
  const icon = document.createElement("img");
  icon.src = `${IMAGE_BASE}${stat.img}`;
  icon.alt = "";
  icon.loading = "lazy";
  pill.append(icon);
  const text = document.createElement("span");
  text.textContent = `${withLabel ? `${t(getLang(), stat.i18nKey)} ` : ""}${formatAmount(amount, true)}`;
  pill.append(text);
  return pill;
}

/** Píldoras con los efectos de JOB_EFFECTS de un empleo, multiplicados por los empleos cubiertos (escala ×100). withLabel: añade el nombre de la estadística. */
function effectPills(jobId, assignedRaw, withLabel) {
  return Object.entries(JOB_EFFECTS[jobId] || {}).map(([statId, perJob]) => statPill(statId, perJob * divideEffect(assignedRaw), withLabel));
}

export function renderNonResourceEffects(jobIds, conditions) {
  const nonResourceEntries = Object.keys(JOB_EFFECTS).filter((jobId) => (jobAssignments[jobId] || 0) > 0);
  const lowHappinessCrime = conditions && conditions.crime ? conditions.crime.fromHappiness : 0;
  const capital = currentCapital();
  const capitalArmies = capital.defenseArmies || 0;
  if ((nonResourceEntries.length || capitalArmies || lowHappinessCrime > 0) && nonResourceEl) {
    nonResourceEl.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "planet-nonresource-heading";
    heading.textContent = t(getLang(), "planetSimNonResourceHeading");
    nonResourceEl.append(heading);
    if (capitalArmies) {
      // Ejércitos de defensa del edificio capital (P7.5): no dependen de la dotación de empleos.
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      const img = document.createElement("img");
      img.className = "planet-nonresource-icon";
      img.src = `${IMAGE_BASE}${capital.img}`;
      img.alt = "";
      line.append(img);
      const text = document.createElement("span");
      text.textContent = `${t(getLang(), capital.i18nKey)} —`;
      line.append(text, statPill("defenseArmies", capitalArmies, true));
      nonResourceEl.append(line);
    }
    nonResourceEntries.forEach((jobId) => {
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      line.append(jobIcon(jobId));
      const text = document.createElement("span");
      text.textContent = `${formatAmount(jobAssignments[jobId])} ${jobName(jobId)} —`;
      line.append(text);
      effectPills(jobId, jobAssignments[jobId], true).forEach((pill) => line.append(pill));
      nonResourceEl.append(line);
    });
    if (lowHappinessCrime > 0) {
      // P9.5: delincuencia que producen los pops por baja felicidad (solo informativa), junto a la de los empleos.
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      line.dataset.effect = "crimeFromHappiness";
      const text = document.createElement("span");
      text.textContent = `${t(getLang(), "conditionsCrimeHappiness")} —`;
      line.append(text, statPill("crime", lowHappinessCrime, true));
      nonResourceEl.append(line);
    }
  } else if (nonResourceEl) {
    nonResourceEl.replaceChildren();
  }
}

/** P17.3: panel "i" del resumen de empleos (dotación, escala ×100, controles, estratos con su eficacia actual, efectos no recurso). */
export function renderJobsInfo(totals, jobIds) {
  const slot = document.querySelector("#planet-jobs-info-slot");
  if (!slot) return;
  syncInfoButtons(getLang());
  const info = createInfoPanel("planet-jobs");
  const addLine = (text) => {
    const line = document.createElement("p");
    line.className = "planet-modifier-stacking";
    line.textContent = text;
    info.append(line);
  };
  const created = jobIds.reduce((sum, jobId) => sum + (totals.jobCapacities[jobId] || 0), 0);
  const staffed = jobIds.reduce((sum, jobId) => sum + (jobAssignments[jobId] || 0), 0);
  addLine(t(getLang(), "jobsInfoStaffing")(formatAmount(created), formatAmount(staffed)));
  addLine(t(getLang(), "jobsInfoScale"));
  addLine(t(getLang(), "jobsInfoControls"));
  // Eficacia por estrato: modificadores stratumEfficiency (T2528: the stratum output % is step 4, not efficiency).
  const byStratum = {};
  (totals.modifiers || []).forEach((modifier) => {
    if (modifier.category === "stratumEfficiency" && modifier.stratum) {
      byStratum[modifier.stratum] = (byStratum[modifier.stratum] || 0) + modifier.value;
    }
  });
  const list = JOB_STRATA.filter((stratum) => Math.abs(byStratum[stratum] || 0) > 1e-9)
    .map((stratum) => `${t(getLang(), STRATUM_I18N_KEYS[stratum])} ${formatAmount(byStratum[stratum] * 100, true)}%`).join(" · ");
  addLine(t(getLang(), "jobsInfoStrata")(list || t(getLang(), "jobsInfoStrataNone")));
  addLine(t(getLang(), "jobsInfoNonResource"));
  slot.replaceChildren(info);
}
