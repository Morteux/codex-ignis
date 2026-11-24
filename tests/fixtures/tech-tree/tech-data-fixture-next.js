/**
 * Second test version of the tech tree (T3303): the fixture of tech-data-fixture.js with a few
 * invented changes, so the comparison between two versions has something of every kind to find.
 * Only for the tests: never imported by a page of the site; the version tests add it to
 * js/tech-versions.js next to the fixture (rulesetId `fixture-next`).
 *
 * Changes from `fixture` (what the comparison must report):
 * - added: tech_fixture_lens_polisher
 * - removed: tech_fixture_found_beacon
 * - base cost: tech_fixture_echo_relay 111 → 150
 * - tier: tech_fixture_wake_skimmer 3 → 4
 * - prerequisites: tech_fixture_assembly_echo + tech_fixture_vine_lattice;
 *   tech_fixture_crease_alloys − tech_fixture_rivet_basics
 * - cost and tier: tech_fixture_drift_coil 444 → 555, tier 4 → 5
 * - not a reported change: the description of tech_fixture_spark_counting
 */
import { TECH_DATA as BASE } from "./tech-data-fixture.js";

const data = structuredClone(BASE);
data.rulesetId = "fixture-next";
data.label = "Test fixture, next version (fake technologies)";
data.gameVersion = "Fixture v0.0.2";

const byId = (id) => data.technologies.find((tech) => tech.id === id);

data.technologies = data.technologies.filter((tech) => tech.id !== "tech_fixture_found_beacon");
byId("tech_fixture_echo_relay").baseCost = 150;
byId("tech_fixture_wake_skimmer").tier = 4;
byId("tech_fixture_assembly_echo").prerequisites.push("tech_fixture_vine_lattice");
byId("tech_fixture_crease_alloys").prerequisites = ["tech_fixture_plate_folding"];
Object.assign(byId("tech_fixture_drift_coil"), { baseCost: 555, tier: 5 });
byId("tech_fixture_spark_counting").description = "A fake starter technology, reworded in the next fixture version.";

const lensPolisher = structuredClone(byId("tech_fixture_prism_cascade"));
Object.assign(lensPolisher, {
  id: "tech_fixture_lens_polisher",
  name: "Fixture Lens Polisher",
  description: "A fake technology that exists only in the next fixture version.",
  kind: "normal",
  flags: [],
  tier: 3,
  baseCost: 333,
  prerequisites: ["tech_fixture_salvaged_lens"],
  icon: "technologies/tech_fixture_lens_polisher.png",
  variants: [],
});
data.technologies.push(lensPolisher);

export const TECH_DATA = data;
