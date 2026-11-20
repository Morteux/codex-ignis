/**
 * Monthly stockpile timeline (P11.2). From a starting stockpile per resource
 * (entered by the user, default 0) and the planet's monthly net, the
 * stockpile after 1, 12, 60 and 120 months: start + net × months, never
 * below 0 (a stockpile cannot be negative). The planet does not change over
 * time (no growth, construction or events) and storage caps are not
 * modelled. Starting stockpiles live only in memory (not saved).
 *
 * Research (it does not accumulate as a stockpile), amenities (a planet
 * value) and trade (converted into other resources by the trade policy) are
 * left out. The engine (js/planet-sim.js) passes its totals in; this module
 * only projects and draws.
 */

import { t } from "./i18n.js";
import { RESOURCES } from "./planet-data.js";

export const TIMELINE_MONTHS = [1, 12, 60, 120];
export const NON_STOCKPILED = ["physics", "society", "engineering", "amenities", "trade"];
const EPSILON = 0.001;

const startStockpiles = {};

/** Stockpile after `months` months: start + net × months, never below 0. */
export function projectStockpile(start, net, months) {
  return Math.max(0, start + net * months);
}

/** Rows of the timeline: stockpiled resources with a net or a starting stockpile, in the canonical resource order. */
export function timelineRows(resourceTotals, starts = startStockpiles) {
  return Object.keys(RESOURCES)
    .filter((id) => !NON_STOCKPILED.includes(id))
    .map((id) => ({ id, start: starts[id] || 0, net: resourceTotals[id] || 0 }))
    .filter((row) => Math.abs(row.net) > EPSILON || row.start > 0)
    .map((row) => ({ ...row, values: TIMELINE_MONTHS.map((months) => projectStockpile(row.start, row.net, months)) }));
}

/**
 * Draws the timeline panel. `helpers`: { lang, totals, resourceIcon(id), formatAmount(amount, forceSign), onChange() }
 * — onChange repaints after a starting stockpile changes.
 */
export function renderStockpileTimeline(container, helpers) {
  if (!container) return;
  const { lang, totals, formatAmount, resourceIcon } = helpers;
  container.replaceChildren();

  const note = document.createElement("p");
  note.className = "planet-modifier-stacking";
  note.textContent = t(lang, "timelineNote");
  container.append(note);

  const rows = timelineRows(totals.resourceTotals || {});
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(lang, "timelineEmpty");
    container.append(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "planet-compare-table planet-timeline-table";
  const head = document.createElement("tr");
  ["", t(lang, "timelineStart"), t(lang, "timelineNet"), ...TIMELINE_MONTHS.map((months) => t(lang, "timelineMonths")(months))].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    head.append(th);
  });
  const thead = document.createElement("thead");
  thead.append(head);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "planet-timeline-row";
    tr.dataset.id = row.id;
    const nameCell = document.createElement("td");
    nameCell.className = "planet-compare-name";
    const name = document.createElement("span");
    name.textContent = t(lang, RESOURCES[row.id].i18nKey);
    nameCell.append(resourceIcon(row.id), name);

    const startCell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.className = "planet-timeline-start";
    input.value = String(row.start);
    input.setAttribute("aria-label", `${t(lang, "timelineStart")}: ${name.textContent}`);
    input.addEventListener("change", () => {
      const value = Number(input.value);
      startStockpiles[row.id] = Number.isFinite(value) && value > 0 ? value : 0;
      helpers.onChange();
    });
    startCell.append(input);

    const cell = (text, className) => {
      const td = document.createElement("td");
      td.className = className;
      td.textContent = text;
      return td;
    };
    tr.append(nameCell, startCell, cell(formatAmount(row.net, true), `planet-compare-value${row.net < 0 ? " is-negative" : ""}`));
    row.values.forEach((value) => tr.append(cell(formatAmount(value, false), "planet-compare-value planet-timeline-value")));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  container.append(table);
}
