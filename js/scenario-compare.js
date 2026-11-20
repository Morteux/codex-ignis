/**
 * Scenario A/B comparison (P11.1). Scenario A is a snapshot of the planet's
 * economy pinned by the user; scenario B is always the live planet. Every
 * value that differs between them is highlighted with its marginal change
 * (B − A), green when it is better and red when it is worse. The snapshot
 * lives only in memory (lost on reload) and is never saved with the planet.
 *
 * The engine (js/planet-sim.js) passes its totals in; this module only takes
 * the snapshot, compares and draws, like js/branch-offices-ui.js.
 */

import { t } from "./i18n.js";
import { RESOURCES } from "./planet-data.js";

const EFFECT_SCALE = 100; // pops and housing are displayed ×100 (100 = 1 pop), see GDD §3
const EPSILON = 0.001;

/** Planet values compared besides the resources; `higherIsBetter: false` = an increase is highlighted as worse. */
export const COMPARED_CONDITIONS = [
  { id: "stability", i18nKey: "compareStability", higherIsBetter: true },
  { id: "happiness", i18nKey: "compareHappiness", higherIsBetter: true },
  { id: "crime", i18nKey: "compareCrime", higherIsBetter: false },
  { id: "freeHousing", i18nKey: "compareFreeHousing", higherIsBetter: true, scale: EFFECT_SCALE },
  { id: "pops", i18nKey: "comparePops", higherIsBetter: true, scale: EFFECT_SCALE }
];

/** Snapshot of the values compared: net resources of the planet and the planet conditions (null = not applicable). */
export function snapshotTotals(totals, label) {
  const conditions = totals.conditions || {};
  return {
    label: label || "",
    resources: { ...(totals.resourceTotals || {}) },
    conditions: {
      stability: conditions.stability && conditions.stability.applicable ? conditions.stability.value : null,
      happiness: conditions.happiness && conditions.happiness.applicable ? conditions.happiness.value : null,
      crime: conditions.crime ? conditions.crime.total : null,
      freeHousing: conditions.housingProvided != null ? conditions.housingProvided - conditions.housingUsage : null,
      pops: conditions.pops != null ? conditions.pops : null
    }
  };
}

/**
 * Rows of the comparison: { kind: "resource" | "condition", id, a, b, delta, changed, better }. `better` is true/false
 * for a changed row (null when unchanged or a side is not applicable). Changed rows first, by size of the change;
 * unchanged rows after them in the canonical order. Resources at 0 on both sides are left out.
 */
export function compareSnapshots(a, b) {
  const resourceOrder = Object.keys(RESOURCES);
  const resourceIds = [...new Set([...Object.keys(a.resources), ...Object.keys(b.resources)])]
    .filter((id) => Math.abs(a.resources[id] || 0) > EPSILON || Math.abs(b.resources[id] || 0) > EPSILON)
    .sort((x, y) => resourceOrder.indexOf(x) - resourceOrder.indexOf(y));
  const row = (kind, id, valueA, valueB, higherIsBetter) => {
    const comparable = valueA != null && valueB != null;
    const delta = comparable ? valueB - valueA : null;
    const changed = comparable ? Math.abs(delta) > EPSILON : valueA !== valueB;
    const better = comparable && changed ? (delta > 0) === higherIsBetter : null;
    return { kind, id, a: valueA, b: valueB, delta, changed, better };
  };
  const rows = [
    ...resourceIds.map((id) => row("resource", id, a.resources[id] || 0, b.resources[id] || 0, true)),
    ...COMPARED_CONDITIONS.map((condition) => row("condition", condition.id, a.conditions[condition.id], b.conditions[condition.id], condition.higherIsBetter))
  ];
  const changed = rows.filter((entry) => entry.changed).sort((x, y) => Math.abs(y.delta || 0) - Math.abs(x.delta || 0));
  return [...changed, ...rows.filter((entry) => !entry.changed)];
}

let pinned = null;

/** Current scenario A (null = none pinned). */
export function getScenarioA() {
  return pinned;
}

/**
 * Draws the comparison panel. `helpers`: { lang, totals, planetName, resourceIcon(id), formatAmount(amount, forceSign),
 * displayAmount(resourceId, amount), onChange() } — onChange repaints after pinning or clearing.
 */
export function renderScenarioCompare(container, helpers) {
  if (!container) return;
  const { lang, totals, formatAmount, displayAmount, resourceIcon } = helpers;
  container.replaceChildren();

  const actions = document.createElement("div");
  actions.className = "planet-compare-actions";
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "planet-capital-btn planet-compare-pin";
  pinBtn.textContent = t(lang, pinned ? "comparePinAgain" : "comparePin");
  pinBtn.addEventListener("click", () => {
    pinned = snapshotTotals(totals, helpers.planetName);
    helpers.onChange();
  });
  actions.append(pinBtn);
  if (pinned) {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "planet-capital-btn planet-compare-clear";
    clearBtn.textContent = t(lang, "compareClear");
    clearBtn.addEventListener("click", () => {
      pinned = null;
      helpers.onChange();
    });
    actions.append(clearBtn);
  }
  container.append(actions);

  const note = document.createElement("p");
  note.className = "planet-modifier-stacking";
  note.textContent = t(lang, pinned ? "compareNote" : "compareEmpty");
  container.append(note);
  if (!pinned) return;

  const current = snapshotTotals(totals, helpers.planetName);
  const rows = compareSnapshots(pinned, current);
  const changedCount = rows.filter((entry) => entry.changed).length;
  const summary = document.createElement("p");
  summary.className = "planet-compare-summary";
  summary.textContent = t(lang, "compareChangedCount")(changedCount);
  container.append(summary);

  const table = document.createElement("table");
  table.className = "planet-compare-table";
  const head = document.createElement("tr");
  [
    "",
    pinned.label ? `${t(lang, "compareScenarioA")} · ${pinned.label}` : t(lang, "compareScenarioA"),
    t(lang, "compareScenarioB"),
    t(lang, "compareChange")
  ].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    head.append(th);
  });
  const thead = document.createElement("thead");
  thead.append(head);
  const tbody = document.createElement("tbody");
  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.className = "planet-compare-row";
    tr.dataset.kind = entry.kind;
    tr.dataset.id = entry.id;
    if (entry.changed) tr.classList.add("is-changed", entry.better === false ? "is-worse" : "is-better");
    const nameCell = document.createElement("td");
    nameCell.className = "planet-compare-name";
    let format;
    if (entry.kind === "resource") {
      nameCell.append(resourceIcon(entry.id));
      const name = document.createElement("span");
      name.textContent = t(lang, RESOURCES[entry.id].i18nKey);
      nameCell.append(name);
      format = (value, sign) => formatAmount(displayAmount(entry.id, value), sign);
    } else {
      const condition = COMPARED_CONDITIONS.find((item) => item.id === entry.id);
      nameCell.textContent = t(lang, condition.i18nKey);
      format = (value, sign) => formatAmount(value * (condition.scale || 1), sign);
    }
    const cell = (text, className) => {
      const td = document.createElement("td");
      td.className = className;
      td.textContent = text;
      return td;
    };
    const notApplicable = t(lang, "compareNotApplicable");
    tr.append(
      nameCell,
      cell(entry.a == null ? notApplicable : format(entry.a, entry.kind === "resource"), "planet-compare-value"),
      cell(entry.b == null ? notApplicable : format(entry.b, entry.kind === "resource"), "planet-compare-value"),
      cell(entry.delta == null ? (entry.changed ? notApplicable : "") : (entry.changed ? format(entry.delta, true) : "="), "planet-compare-delta")
    );
    tbody.append(tr);
  });
  table.append(thead, tbody);
  container.append(table);
}
