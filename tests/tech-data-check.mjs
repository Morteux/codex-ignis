/**
 * Tech tree data checks (T3002): runs the validations of js/tech-tree-validate.js on the test
 * fixture and on every data file of js/tech-data/, and checks that the validations catch broken
 * data (duplicate id, unknown prerequisite, cycle, missing area / field / tier, unknown kind).
 *
 *   node tests/tech-data-check.mjs [root]
 *
 * Prints one line per data file and per self-test and ends with `problems N`; exit code 1 if N > 0.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] || ".");
const load = async (path) => import(pathToFileURL(join(root, path)).href);
const { validateTechData } = await load("js/tech-tree-validate.js");

const FIXTURE = "tests/fixtures/tech-tree/tech-data-fixture.js";
const dataDir = join(root, "js", "tech-data");
const files = [FIXTURE, ...(existsSync(dataDir) ? readdirSync(dataDir).filter((f) => f.endsWith(".js")).sort().map((f) => "js/tech-data/" + f) : [])];

let problems = 0;
for (const file of files) {
  const { TECH_DATA } = await load(file);
  const found = validateTechData(TECH_DATA);
  console.log(`${file}: ${TECH_DATA.technologies.length} technologies, ${found.length} problems`);
  found.slice(0, 20).forEach((p) => console.log("  " + p));
  problems += found.length;
}

// Self-tests: each broken copy of the fixture must give the expected problem
const { TECH_DATA: fixture } = await load(FIXTURE);
const broken = (change) => {
  const data = structuredClone(fixture);
  change(data.technologies, data);
  return validateTechData(data);
};
const [a, b, c] = fixture.technologies.filter((t) => t.prerequisites.length);
const SELF_TESTS = [
  ["duplicate id", (T) => T.push({ ...T[0] }), `${fixture.technologies[0].id}: duplicate id`],
  ["unknown prerequisite", (T) => T[1].prerequisites.push("tech_fixture_missing"), "unknown prerequisite tech_fixture_missing"],
  ["cycle", (T) => T.find((t) => t.id === a.prerequisites[0]).prerequisites.push(a.id), "prerequisite cycle:"],
  ["self cycle", (T) => T.find((t) => t.id === b.id).prerequisites.push(b.id), "prerequisite cycle:"],
  ["no area", (T) => { delete T.find((t) => t.id === c.id).area; }, `${c.id}: no area`],
  ["no field", (T) => { T.find((t) => t.id === c.id).field = ""; }, `${c.id}: no field`],
  ["no tier", (T) => { T.find((t) => t.id === c.id).tier = null; }, `${c.id}: no tier`],
  ["unknown field", (T) => { T[2].field = "fixture_nowhere"; }, "unknown field fixture_nowhere"],
  ["unknown kind", (T) => { T[2].kind = "mystery"; }, "unknown kind mystery"],
  ["no icon", (T) => { delete T.find((t) => t.id === c.id).icon; }, `${c.id}: no icon path`],
];
for (const [name, change, expected] of SELF_TESTS) {
  const found = broken(change);
  const ok = found.some((p) => p.includes(expected));
  console.log(`self-test ${name}: ${ok ? "caught" : "MISSED"}`);
  if (!ok) problems += 1;
}
console.log(`problems ${problems}`);
process.exit(problems ? 1 : 0);
