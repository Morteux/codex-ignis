# Game icons of the site's concepts (T2602)

Concepts the site shows as text where Stellaris has an icon for the same idea. Every icon comes from the game files 4.5.4 (`interface/*.gfx` sprite → `gfx/interface/...dds` texture) and is served from StellarisAssets (`STELLARIS_ASSETS_BASE`, folder/file below). The export is `python tools/extract/export_ui_icons.py` (`--check` lists the icons without writing): it converts the textures with the extractor's icon exporter (§6 of `GAME_FILES_EXTRACTOR.md`) and only replaces a file when it changed.

Rule for the pages (T2603, T2604 and the tasks below): the icon replaces the word, the word stays as the icon's `title` (tooltip) and accessible name (`alt` or `aria-label`), so screen readers and hover still give the text.

## 1. Icons

| Concept | Game sprite (texture) | StellarisAssets | Where the site shows it as text today |
|---|---|---|---|
| Resource upkeep (per resource) | `GFX_mod_<res>_upkeep_add` (`gfx/interface/icons/modifiers/`) | `modifiers/mod_<res>_upkeep_add.png` | Net breakdown lines "… (upkeep)", "Jobs: base upkeep", "Districts (upkeep)", "Buildings (upkeep)"; Produced / Consumed columns; job rows; building and district tooltips (upkeep); catalogue cards |
| Resource upkeep change (%) | `GFX_mod_<res>_upkeep_mult` | `modifiers/mod_<res>_upkeep_mult.png` | Net breakdown "Jobs: output penalty / upkeep change"; Active modifiers (upkeep multipliers); edicts and policies effects |
| Resource bonus (flat, per job) | `GFX_mod_<res>_produces_add` | `modifiers/mod_<res>_produces_add.png` | Net breakdown "Jobs: building bonuses (output)", "Jobs: edicts (per job)", "Jobs: branch office (per job)", "Buildings: flat output"; Active modifiers (job flat); building tooltips |
| Resource efficiency / % of output | `GFX_mod_<res>_produces_mult` | `modifiers/mod_<res>_produces_mult.png` | Net breakdown "Jobs: efficiency (output)", "Buildings / Policies / Celestial body / Designation / Specializations / Planet modifiers / Branch office: % of job output", "Empire: … multipliers"; Active modifiers (job efficiency, % of job output); designation, edict and policy effects |
| Job (generic), job count | `GFX_text_job` (`text_icons/tooltip_job.dds`) | `text_icons/tooltip_job.png` | "Jobs" headings and counters, job lines of building / district / specialization tooltips (already `img/ui/Pop_job.png` in the summary and the jobs heading) |
| Unemployment | `GFX_text_job_unemployment` (`text_icons/unemployed.dds`) | `text_icons/unemployed.png` | Staffing notice, civilians |
| Pop | `GFX_text_pop` (`text_icons/icon_text_pop.dds`), `GFX_text_tooltip_pop` (`text_icons/tooltip_pop.dds`) | `text_icons/icon_text_pop.png`, `text_icons/tooltip_pop.png` | Civilians input, Neural Chips, pops in Conditions, "per pop" texts (already `img/ui/Icon_pop.png` in the species heading) |
| Pop upkeep | `GFX_text_pop_modifier` (`text_icons/pop_modifier.dds`) | `text_icons/pop_modifier.png` | Net breakdown "Pop upkeep: species type / living standard / edicts"; living standards cards |
| Stratum: ruler | (`pop_categories/pop_cat_ruler.dds`); `GFX_text_ruler` (`text_icons/text_icon_ruler.dds`) | `pop_categories/pop_cat_ruler.png`, `text_icons/text_icon_ruler.png` | Jobs summary stratum headings, job efficiency by stratum (modifiers, designations, living standards) |
| Stratum: specialist | (`pop_categories/pop_cat_specialist.dds`) | `pop_categories/pop_cat_specialist.png` | idem |
| Stratum: worker | (`pop_categories/pop_cat_worker.dds`) | `pop_categories/pop_cat_worker.png` | idem |
| Stratum: complex / simple drone (gestalt) | (`pop_categories/pop_cat_complex_drone.dds`, `pop_cat_simple_drone.dds`) | `pop_categories/pop_cat_complex_drone.png`, `pop_cat_simple_drone.png` | idem for gestalt empires |
| Civilian / Maintenance drone | (`pop_categories/pop_cat_civilian.dds`, `pop_cat_maintenance_drone.dds`) | `pop_categories/pop_cat_civilian.png`, `pop_cat_maintenance_drone.png` | Civilians row in Conditions and the breakdown line "Civilians" |
| Slave, Bio-Trophy | (`pop_categories/pop_cat_slave.dds`, `pop_cat_bio_trophy.dds`) | `pop_categories/pop_cat_slave.png`, `pop_cat_bio_trophy.png` | Special stratum jobs (Bio-Trophy swaps, living standards) |
| Stability | `GFX_text_stability` (`text_icons/tooltip_stability.dds`) | `text_icons/tooltip_stability.png` | Conditions panel, breakdown "Stability effect on job output", job and building effects (+stability), edicts, modifiers (now `modifiers/mod_planet_stability_add.png` in some places) |
| Amenities | `GFX_text_amenities` (`text_icons/tooltip_amenities.dds`); gestalt `GFX_text_amenities_no_happiness` | `text_icons/tooltip_amenities.png`, `text_icons/tooltip_amenities_no_happiness.png` | Header stat (now `mod_planet_amenities_add`), Conditions, job and building effects, amenities tooltip |
| Housing | `GFX_text_housing` (`text_icons/tooltip_housing.dds`) | `text_icons/tooltip_housing.png` | Header stat (now `mod_planet_housing_add`), Conditions, district and building housing, housing tooltip |
| Crime | `GFX_text_crime` (`text_icons/tooltip_crime.dds`) | `text_icons/tooltip_crime.png` | Conditions, job effects (Enforcer), edicts, branch offices (illegal) |
| Happiness | `GFX_text_happiness` (`text_icons/tooltip_happiness.dds`) | `text_icons/tooltip_happiness.png` | Conditions (manual happiness), body type and edict effects |
| Build time | `GFX_text_time` (`resources/time.dds`); infrastructure build speed `GFX_mod_planet_building_build_speed_mult`, build time `GFX_mod_planet_building_time_mult` | `text_icons/time.png`, `modifiers/mod_planet_building_build_speed_mult.png`, `modifiers/mod_planet_building_time_mult.png` | Planet summary total build time (T2601, uses `mod_planet_building_time_mult`), catalogue cost lines "… days", capital tooltips, "Infrastructure Build Speed" planet modifier texts |
| Build Queue Capacity | `GFX_mod_planet_building_capacity_add` | `modifiers/mod_planet_building_capacity_add.png` | Build time panel (T2601) |
| District | `GFX_text_district` (`text_icons/tooltip_district.dds`); add district `GFX_text_districtadd` | `text_icons/tooltip_district.png`, `text_icons/districtadd.png` | Districts header stat, catalogue tab, district cards (already `img/ui/Tooltip_district.png` in the header and tab) |
| Zone (district specialization) | `GFX_text_zone` (`text_icons/tooltip_zone.dds`) | `text_icons/tooltip_zone.png` | Specialization selectors and slot headings (already `img/ui/Tooltip_zone.png` in places) |
| Building | `GFX_text_building` (`text_icons/tooltip_building.dds`) | `text_icons/tooltip_building.png` | Slots heading, catalogue tab (already `img/ui/Tooltip_building.png`) |
| Upgrade | `GFX_text_upgrade` (`text_icons/tooltip_upgrade.dds`) | `text_icons/tooltip_upgrade.png` | Capital Upgrade button, building upgrade chains, "with its earlier tiers" (T2601) |
| Trade value | `GFX_text_trade_value` (`text_icons/trade_value.dds`) | `text_icons/trade_value.png` | Trade conversion line and info, living standard trade |
| Empire modifier | `GFX_text_empire` (`text_icons/empire_modifier.dds`) | `text_icons/empire_modifier.png` | External income, "Empire: … multipliers" breakdown line, empire-wide edict effects |
| Economy | `GFX_text_economy` (`text_icons/tooltip_economy.dds`) | `text_icons/tooltip_economy.png` | Production heading (now `img/ui/Empire_economy.png`) |
| Decision | `GFX_text_decision` (`text_icons/tooltip_decision.dds`) | `text_icons/tooltip_decision.png` | Planet modifier texts that enable a decision |
| Defense armies, naval capacity | `GFX_mod_planet_defense_armies_add`, `GFX_mod_navy_size_add` | `modifiers/…` (already used, `STAT_EFFECTS`) | — |
| Planet size | (no game text icon) | `img/ui/Planet_Size.png` (already used) | — |

`<res>` is the game resource key: `energy`, `minerals`, `food`, `alloys`, `consumer_goods`, `unity`, `physics_research`, `society_research`, `engineering_research`, `trade`, `influence`, `volatile_motes`, `rare_crystals`, `exotic_gases`, `minor_artifacts`, `astral_threads`, `advanced_logic`, `nanites`, `sr_zro` (simulator `zro`), `biomass`; amenities use the text icon. All 80 resource icons are in StellarisAssets (T2602 added unity, society research, trade, volatile motes and Zro; the rest were already there).

No game icon was found for: "Gross" / "Costs" / "Net" totals, "per job" / "per pop" (the game writes them as text too), the A/B comparison and the stockpile timeline (site features).

## 2. Where each page area still needs them

| Area | Task |
|---|---|
| Planet simulator — net resource breakdown and production info panel | T2603 |
| Planet simulator — main tabs, panel headings, fixed planet summary, catalogue tabs, capital buttons | T2604 (done: Active modifiers heading `text_icons/empire_modifier.png`, Upgrade button `text_icons/tooltip_upgrade.png`) |
| Planet simulator — header stats, Conditions panel, jobs summary (strata) | T2605 (done; shared helper `js/concept-icons.js`) |
| Planet simulator — Active modifiers panel, catalogue cards, building / district / capital tooltips | T2606 |
| Wiki (resources, jobs and buildings articles) | T2607 |
| Tech tree card (unlocked buildings, districts and modifiers) | T2608 |
| Testellaris and bingo (question texts, item tooltips) | T2609 |
