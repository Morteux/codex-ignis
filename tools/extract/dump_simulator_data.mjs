// Dumps the simulator data for the difference report (T2522, tools/extract/report_differences.py):
// node tools/extract/dump_simulator_data.mjs > simulator-data.json
// Output: { modules: { "<file>.js": { <export>: value } }, policyGroups: [...], en: { <i18n key>: text } }.
// The modules are every js/*-data.js plus the data lists that live elsewhere (civics, origins);
// functions are dropped, Maps and Sets become objects and arrays. Nothing in js/ is changed.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTRA_MODULES = ["bingo-items.js", "civic-rules.js"];
const POLICY_GROUP_IDS = ["economic", "trade", "production", "stance"];
const toJson = (value) => JSON.parse(JSON.stringify(value, (k, v) => (v instanceof Map ? Object.fromEntries(v) : v instanceof Set ? [...v] : v)) ?? "null");
const load = (file) => import(pathToFileURL(join(root, "js", file)).href);

const jsFiles = readdirSync(join(root, "js"));
const modules = {};
for (const file of [...jsFiles.filter((f) => f.endsWith("-data.js")).sort(), ...EXTRA_MODULES]) {
  modules[file] = {};
  for (const [name, value] of Object.entries(await load(file))) {
    if (typeof value !== "function") modules[file][name] = toJson(value);
  }
}

// The policy groups are not exported as a list; getPolicyGroup() gives each one.
const { getPolicyGroup } = await load("policy-data.js");
const policyGroups = POLICY_GROUP_IDS.map((id) => toJson(getPolicyGroup(id))).filter(Boolean);

const en = {};
for (const file of jsFiles.filter((f) => /^i18n-.+\.js$/.test(f)).sort()) {
  const { strings } = await load(file);
  for (const [key, text] of Object.entries(strings?.en ?? {})) if (typeof text === "string") en[key] = text;
}

process.stdout.write(JSON.stringify({ modules, policyGroups, en }));
