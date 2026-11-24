/**
 * Automatic validations of a tech tree data file (TECH_TREE_GDD.md section 4.2, T3002).
 * Pure functions, no DOM: the tests run them with node on the fixture and on every real data file,
 * and the page can run them too before drawing.
 */

export const TECH_AREAS = ["physics", "society", "engineering"];
export const TECH_KINDS = ["normal", "starter", "acquisition", "rare", "dangerous", "repeatable", "event"];

/** Prerequisite cycles as lists of ids (`a → b → a`), each one reported once. */
function findCycles(techs) {
  const byId = new Map(techs.map((tech) => [tech.id, tech]));
  const state = new Map(); // id -> 1 visiting, 2 done
  const cycles = [];
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    for (const pre of byId.get(id).prerequisites || []) {
      if (!byId.has(pre)) continue;
      if (state.get(pre) === 1) cycles.push([...stack.slice(stack.indexOf(pre)), pre]);
      else if (!state.has(pre)) visit(pre);
    }
    stack.pop();
    state.set(id, 2);
  };
  byId.forEach((_, id) => { if (!state.has(id)) visit(id); });
  return cycles;
}

/**
 * Problems of a data file `{ areas?, fields?, tiers?, technologies }` as English strings (empty
 * array = valid): unique ids, area / field / tier / kind present and known, every prerequisite
 * exists, no prerequisite cycles.
 */
export function validateTechData(data) {
  const problems = [];
  const techs = (data && data.technologies) || [];
  if (!techs.length) return ["no technologies"];
  const areas = new Set(data.areas || TECH_AREAS);
  const fields = data.fields ? new Set(data.fields.map((field) => field.id)) : null;
  const tiers = data.tiers ? new Set(data.tiers.map((tier) => tier.tier)) : null;
  const seen = new Set();
  techs.forEach((tech, index) => {
    const id = tech && tech.id;
    if (!id) { problems.push(`technology #${index}: no id`); return; }
    if (seen.has(id)) problems.push(`${id}: duplicate id`);
    seen.add(id);
    if (!tech.area) problems.push(`${id}: no area`);
    else if (!areas.has(tech.area)) problems.push(`${id}: unknown area ${tech.area}`);
    if (!tech.field) problems.push(`${id}: no field`);
    else if (fields && !fields.has(tech.field)) problems.push(`${id}: unknown field ${tech.field}`);
    if (!Number.isInteger(tech.tier)) problems.push(`${id}: no tier`);
    else if (tiers && !tiers.has(tech.tier)) problems.push(`${id}: unknown tier ${tech.tier}`);
    if (!TECH_KINDS.includes(tech.kind)) problems.push(`${id}: unknown kind ${tech.kind}`);
    if (!Array.isArray(tech.prerequisites)) problems.push(`${id}: prerequisites is not a list`);
  });
  const ids = new Set(techs.map((tech) => tech && tech.id));
  techs.forEach((tech) => {
    if (!tech || !tech.id || !Array.isArray(tech.prerequisites)) return;
    tech.prerequisites.filter((pre) => !ids.has(pre)).forEach((pre) => problems.push(`${tech.id}: unknown prerequisite ${pre}`));
  });
  const valid = techs.filter((tech) => tech && tech.id && Array.isArray(tech.prerequisites));
  findCycles(valid).forEach((cycle) => problems.push(`prerequisite cycle: ${cycle.join(" → ")}`));
  return problems;
}
