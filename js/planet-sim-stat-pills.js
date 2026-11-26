/**
 * Planet simulator: game icon pills of the catalogue cards and the capital (T2606, ICONS.md).
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { conceptIcon, resourceModifierIconUrl } from "./concept-icons.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS } from "./empire-data.js";
import { getPlanetState } from "./planet-state.js";
import { formatAmount, resourceName } from "./planet-sim-text.js";

/**
 * T2606: game icon pills of a catalogue card (ICONS.md): housing, amenities, upkeep per resource and build time.
 * The number is visible; the concept words are the pill's tooltip and the icon's alt (accessible name).
 * Housing and amenities are in the ×100 scale of the data, like the other catalogue numbers.
 */
export function renderStatPills({ housing, amenities, upkeep, days }) {
  const pills = [];
  const pill = (img, text, label, kind) => {
    const el = document.createElement("span");
    el.className = "planet-catalog-job-pill planet-catalog-stat-pill";
    el.dataset.stat = kind;
    el.title = label;
    if (img) { img.alt = label; img.removeAttribute("title"); el.append(img); }
    const value = document.createElement("span");
    value.textContent = text;
    el.append(value);
    pills.push(el);
  };
  if (housing) pill(conceptIcon("housing"), formatAmount(housing, true), t(getLang(), "planetSimHousingLabel")(formatAmount(housing)), "housing");
  if (amenities) pill(conceptIcon("amenities", { gestalt: ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id) }), formatAmount(amenities, true), t(getLang(), "planetSimAmenitiesLabel")(formatAmount(amenities)), "amenities");
  Object.entries(upkeep || {}).filter(([, amount]) => amount).forEach(([resource, amount]) => {
    const url = resourceModifierIconUrl(resource, "upkeep_add");
    const img = url ? Object.assign(document.createElement("img"), { src: url, loading: "lazy", className: "concept-icon" }) : null;
    pill(img, formatAmount(Math.abs(amount)), `${t(getLang(), "breakdownKindUpkeep")}: ${formatAmount(Math.abs(amount))} ${resourceName(resource)}`, `upkeep-${resource}`);
  });
  if (days) pill(conceptIcon("buildTime"), t(getLang(), "buildTimeDays")(days), `${t(getLang(), "planetSimBuildTimeWord")}: ${t(getLang(), "planetSimCostDays")(days)}`, "buildTime");
  if (!pills.length) return null;
  const wrapper = document.createElement("span");
  wrapper.className = "planet-catalog-jobs planet-catalog-stats";
  wrapper.append(...pills);
  return wrapper;
}
