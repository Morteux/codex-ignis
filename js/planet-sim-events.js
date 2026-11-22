/**
 * Planet simulator: reactions to the rest of the page — language change, empire switched,
 * policies reset, edicts removed and changes of the shared planet state (js/planet-state.js).
 */

import { t } from "./i18n.js";
import { getLang, onLanguageChange } from "./page-shell.js";
import { onPlanetStateChange, onEmpireSwitched, onPoliciesReset, onEdictsRemoved } from "./planet-state.js";
import { getEdict } from "./edict-data.js";
import { getPolicyGroup, getPolicyOption } from "./policy-data.js";
import { refresh } from "./planet-sim.js";
import { showNotice } from "./planet-sim-dom.js";
import { renderDesignationSelect } from "./planet-sim-planet-ui.js";
import { isBuildingAvailable } from "./planet-sim-rules.js";
import { builtMap, buildingsById } from "./planet-sim-state.js";

onLanguageChange(() => {
  renderDesignationSelect();
  refresh();
});

/**
 * Cambio de imperio guardado (P5.4): NO se borra ningún edificio. Los que no
 * cumplen los requisitos del nuevo imperio quedan inactivos (marco amarillo,
 * igual que al editar la pestaña Imperio a mano, P3.4) y se reactivan solos
 * si se vuelve a un imperio que los cumple; demolerlos es decisión del
 * usuario. Solo se avisa de cuántos han quedado inactivos por requisitos.
 */
onEmpireSwitched(({ name }) => {
  let inactive = 0;
  builtMap.forEach((buildingId) => {
    if (!isBuildingAvailable(buildingsById.get(buildingId))) inactive += 1;
  });
  refresh();
  showNotice(t(getLang(), "planetSimEmpireSwitchNotice")(name, inactive));
});

// Políticas que se restablecen solas (P16.3): cambio entre imperio normal y gestalt, o requisitos que dejan de cumplirse.
onPoliciesReset(({ typeChange, gestalt, policyIds, changes }) => {
  const optionName = (groupId, optionId) => t(getLang(), getPolicyOption(groupId, optionId).i18nKey);
  if (typeChange) {
    const trade = optionName("trade", policyIds.trade);
    showNotice(t(getLang(), gestalt ? "planetSimPolicyTypeChangeGestalt" : "planetSimPolicyTypeChangeIndividualist")(trade));
    return;
  }
  const parts = changes.map((change) => t(getLang(), "planetSimPolicyResetItem")(t(getLang(), getPolicyGroup(change.group).i18nKey), optionName(change.group, change.from), optionName(change.group, change.to)));
  showNotice(t(getLang(), "planetSimPolicyResetNotice")(parts.join(" ")));
});

// Edictos desactivados solos por requisitos (P18.3).
onEdictsRemoved(({ removed }) => {
  const names = removed.map((id) => { const edict = getEdict(id); return edict ? t(getLang(), edict.i18nKey) : id; });
  showNotice(t(getLang(), "planetSimEdictsRemovedNotice")(names.join(", ")));
});

// Reacciona a lo que otros módulos escriben en el estado compartido: tipo de
// cuerpo celeste (filtra las designaciones), éticas/autoridad (bonos) y
// principios (requisitos de edificios).
// Solo se recalcula si esos datos han cambiado de verdad, para no entrar en
// bucle con las propias escrituras de este módulo (tamaño/población).
let lastRelevantKey = "";
onPlanetStateChange((state) => {
  const key = `${state.celestialTypeId}|${(state.ethicIds || []).join(",")}|${state.authorityId}|${state.originId}|${(state.civicIds || []).join(",")}|${state.speciesType}|${JSON.stringify(state.policyIds || {})}|${(state.edictIds || []).join(",")}`;
  if (key === lastRelevantKey) return;
  lastRelevantKey = key;
  renderDesignationSelect();
  refresh();
});
