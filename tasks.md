# Planet Simulator — pending tasks

Design rules and decisions: `PLANET_SIM_GDD.md`. Finished phases (P0–P8 incl. P7.10, P16.1–P16.12, P9.1–P9.7, P12.1, P13.7, P17, P18 — edicts audit in GDD §5.1, P10.1 — body types audit in GDD §4.1, P10.2, P10.3, P10.4) are in git history.
Order is a proposal; **P14 is always last**. When a task is done, remove it from this file and move any new design decision into the GDD.

## P10 — Special planets
Sources: *Celestial object* page (base modifiers per body type); Requirements column of the Districts/buildings pages (no body-type requirement = all bodies).
- [ ] P10.5 Hive, machine, nanite worlds, synaptic lathe
- [ ] P10.6 Gaia / relic / tomb / volcanic; wilderness-origin districts
- [ ] P10.7 Size and district-limit rules for artificial bodies
- [ ] P10.8 Planetary features, blockers, deposits and planet modifiers (Cuerpo celeste tab)
- [ ] P10.9 Remaining urban specializations: Administrative Hub (not Spiritualist / Rogue Servitor; administrator job per authority), Spiritual Enclave (Spiritualist), primary-only Archives and Urban Expansion
- [ ] P10.10 Re-read every requirement column of the existing districts/specializations/buildings (the regenerated markdown keeps `![No](24px-No.png)` = "not"); e.g. Agricultural Focus is not available with Anglers on a wet-climate world (Aquaculture replaces it)

## P19 — Branch offices (Sucursales tab)
Models another empire placing branch office buildings on this planet; any branch office building can be chosen.
- [ ] P19.1 Audit branch office buildings (4.5.2 wiki): effects on the host planet, requirements, slots
- [ ] P19.2 Sucursales tab: pick branch office buildings
- [ ] P19.3 Engine: effects on the planet economy; branch-office trade joins the trade conversion
- [ ] P19.4 Saved with the planet (optional field)

## P20 — Pop upkeep and living standards
Needs the 4.5.2 *Living standards* wiki page (owner provides it when this task starts).
- [ ] P20.1 Audit living standards: pop upkeep per standard and stratum/species type, effects (happiness, political power...), availability by ethics/authority/civics
- [ ] P20.2 Living standard saved with the empire profile (optional field), selectable in the Imperio tab
- [ ] P20.3 Engine: pop upkeep (food/minerals/energy/consumer goods...) on top of job upkeep, with its own breakdown lines and modifier category
- [ ] P20.4 Edicts with pop upkeep effects (Recycling Campaign, Nutritional Plenitude, Expanded Breeding Program) added to `js/edict-data.js`

## P11 — Comparison & timeline
- [ ] P11.1 Scenario A/B comparison with marginal-change highlighting
- [ ] P11.2 Monthly stockpile timeline (1 / 12 / 60 / 120 months)
- [ ] P11.3 Deficit and stockpile-exhaustion flags

## P12 — UI icons
- [ ] P12.2 Review the StellarisAssets repository and re-apply every available icon by its real in-game meaning (replaces the loose placements of the first pass, e.g. `Faction_support`, `Colony_type_automated`; `Menu_icon_technology` unused). No policy icons exist: policies stay text-only.
- [ ] P12.3 Mark the empire-level tabs (Imperio, Edicts) as saved with the empire profile. Proposal: semi-transparent empire icon as tab background, shared accent line, tooltip "Saved with the empire profile".

## P13 — Polish & QA
- [ ] P13.1 Mobile layout review of all tabs
- [ ] P13.2 i18n parity check for all new strings
- [ ] P13.3 Automated UI smoke tests (tabs, save/load, empire switch)
- [ ] P13.4 Accessibility pass
- [ ] P13.6 Replace the hand-written es/jp texts (policy group titles/notes/effects, requirement reasons, policy notices, empire-tab policy heading, stacking and trade-conversion texts, P7.8 resource/category names) with the English text

## P15 — Official localization
- [ ] P15.1 Receive the game localisation files (owner) and decide the extraction format
- [ ] P15.2 Replace es/en/jp game names (civics, buildings, jobs, resources, designations, ethics, authorities, planet types, policies) with official strings keyed by game ids
- [ ] P15.3 All official Stellaris languages for the planet simulator and the tech tree only (wiki and bingo stay es/en/jp); key parity per language
- [ ] P15.4 Review the civics with English placeholder names and the keys that group several civics under one icon

## P14 — Final 4.5.2 data verification (last)
- [ ] P14.1 Owner re-uploads the updated wiki files
- [ ] P14.2 Review every value (jobs, buildings, districts, designations, ethics, authorities, civics, capital, resources, policies, edicts, branch offices) against them
- [ ] P14.3 Update `verification` statuses (`unverified` → `wiki-verified`)
- [ ] P14.4 Review GDD §9 (assumptions and stacking rules)
- [ ] P14.5 Deliver the final data files
