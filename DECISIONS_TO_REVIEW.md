# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

## P13.9 — Landmark aria-labels of the other pages translated (2026-11-21)
- [ ] **Also `404.html` and `tech-tree.html`**: they use the same `js/legal.js` and had the same hard-coded Spanish labels, so they were included.
- [ ] **New keys** `a11yOnlineStatus`, `a11yArchiveExplorer`, `a11yKnowledgeNav`, `a11yEntryCount`, `a11yAdSlot`, `a11yLegalNav`, `a11yCloseImage`, `a11yBingoGrid`, with proposed EN/JP translations (e.g. JP "ビンゴのマス", "広告用の予約スペース"); the header, home link, projects nav and language switch reuse the P13.4 keys.
- [ ] **`js/app.js` now applies `data-i18n-attr`** (single "attr:key" pair, like `js/legal.js` and `js/bingo.js`).

## P13.8 — Data texts moved to i18n keys (2026-11-21)
- [ ] **English in es, en and jp** for the 253 new keys (planet modifier not-modelled effects and sources, body type info lines, job swap names, unmodelled swap conditions and not-modelled swap effects) until the official localisation (P15).
- [ ] **Key names**: `<modifier i18nKey>NotModelled<n>` / `<modifier i18nKey>Source`, `bodyInfo<Body><n>`, `job<PascalCase swap id>` (the name already used by modelled swaps), and `swapReq…` / `swapNotModelled…` built from the first words of the English text.
- [ ] **Data fields renamed** so raw text cannot slip back in: `notModelledKeys`, `sourceKey`, `infoOnlyKeys`; swaps lose `name`; `um(kind, i18nKey)` like the other unmodelled requirements.
- [ ] **Body type info lines are now shown**: they were in the data but displayed nowhere; they appear in the tooltip of each body card in the Cuerpo celeste tab under "Not computed by the simulator:" (English label, like the other planet-modifier labels).
- [ ] **Colonial Spirit / Fresh Consciousness**: the not-modelled effect that the wiki import had split at a comma inside parentheses ("+10% Pop growth or assembly speed (Pop growth speed, Mechanical pop assembly speed)") is one line again. No figure changed.
- [ ] **Swap not-modelled effects stay hidden** (as before): they are now keys, but no screen lists them yet.

## P13.4 — Accessibility pass (2026-11-21)
- [ ] **Scope: the planet simulator only** (`planet-sim.html`); the wiki, bingo and legal pages still have hard-coded Spanish landmark labels (new task T1309).
- [ ] **WAI-ARIA tabs pattern** for the main tabs and Buildings/Districts: `role=tab`/`tabpanel`, `aria-selected`, roving `tabindex` (only the active tab is in the Tab order), Left/Right (also Up/Down), Home and End move between tabs and **activate them at once** (automatic activation, as the panels render instantly).
- [ ] **Screen-reader labels** for the "−"/"+" district and job buttons name the district or job ("Remove one district: City district", "More Clerks staffed"); the count control is a labelled group with the built count; specialization selects, the empire name field, the species select and the planet name field get labels; landmark labels follow the language.
- [ ] **Language buttons** keep the visible "ES/EN/JP" but are read as their own language names (Español, English, 日本語), not translated.
- [ ] **Reduced motion**: with `prefers-reduced-motion: reduce` every transition and animation is turned off.
- [ ] **Not changed**: colours and contrast (the terminal palette is part of the design; no audit tool run), focus styles (the global `:focus-visible` outline was already there), the confirm dialogs (already trap focus, close with Escape and return the focus).
- [ ] **Districts catalog on mobile**: the new Districts check showed long specialization names widening the cards past 320 px; the cards now shrink and the selects are capped at the card width.

## P13.1 — Mobile layout review of all tabs (2026-11-21)
- [ ] **Target width 320 px** (the page's `min-width`): every tab is checked by the smoke test to never scroll sideways at that width.
- [ ] **Wide tables scroll inside their panel**: the A/B comparison and the monthly stockpile tables get their own horizontal scroll instead of being reflowed into cards.
- [ ] **Under 700 px**: tighter panel and tab padding, a smaller ethics wheel (2.8rem cells instead of 3.4rem), header stats laid out as label/value rows, and the summary bar selects shrink to the screen width.

## P12.3 — Empire-level tabs marked as saved with the empire profile (2026-11-21)
- [ ] **Proposal applied as is**: Imperio and Edicts get the government category icon (`modifiers/mod_cat_government.png`, the same as the Imperio tab icon) at 18 % opacity as background, a shared 3 px gold accent line (`#d8b45a`, distinct from the active-tab accent) and the tooltip "Saved with the empire profile" (es/en/jp).
- [ ] **Library tab not marked**, although it lists saved empires: it holds planets too, and it is not where the empire is edited.

## P12.2 — UI icons by in-game meaning (2026-11-21)
- [ ] **Government category icon** (`modifiers/mod_cat_government.png`) for the Imperio tab, the empire profile, saved empires and civics (no generic civic icon exists); authorities keep `Icon_council`.
- [ ] **Branch offices** use `modifiers/mod_branch_office_value_mult.png` (was `Faction_support`); **species type** uses `Icon_pop` (was `Colony_type_automated`); **ethics** use `modifiers/mod_ethic_attraction_mult.png`; **jobs summary** uses the generic `Pop_job` (was the specific `Job_clerk`).
- [ ] **Celestial body** tab and heading use `planets/Planet_continental.png` as a generic planet (was `Focus_core`, a council focus icon).
- [ ] **Production** uses `Empire_economy`; **stockpile timeline** uses `modifiers/mod_cat_economy.png`; **conditions** use `resources/Stability.png`; **policies** heading uses `Menu_icon_policies` (the in-game Policies & Edicts menu; single policies stay text-only).
- [ ] **No matching icon → text-only**: the A/B comparison and active modifiers headings lost their loose icons (`Focus_development`, `Menu_icon_traditions`).
- [ ] **Left unused** in `img/ui/`: `Menu_icon_technology` (nothing in the simulator is about technology; the site nav has no icons), `Faction_support`, `Colony_type_automated`, `Focus_core`, `Focus_development`, `Menu_icon_traditions`, `Menu_icon_leaders`, `Job_clerk`, `Diplomacy_*`. Files not deleted.
- [ ] **Advanced Logic icon** split into T1204 (blocked): the wiki image could not be downloaded from this environment.

## P11.3 — Deficit and stockpile-exhaustion flags (2026-11-21, GDD §6)
- [ ] **Deficit = negative planet net** of a stockpiled resource, even when the empire's other planets or external income would cover it (the simulator only sees this planet).
- [ ] **Exhaustion month = ceil(start / −net)**: the first whole month after which the stockpile is 0; a stockpile starting at 0 is "empty" right away.
- [ ] **Deficit penalties not modelled**: the 4.5.2 *Resources* page could not be read, so the flags only warn and change nothing in the economy or the conditions.

## P11.2 — Monthly stockpile timeline (2026-11-21, GDD §6)
- [ ] **Linear projection of the current planet**: start + net × months; no pop growth, construction, events or monthly changes.
- [ ] **Storage caps not modelled**: the 4.5.2 *Resources* page could not be read (the wiki did not load), so no cap figure is used; stockpiles only stop at 0.
- [ ] **Resources left out**: research (physics / society / engineering), amenities and trade (already converted into other resources by the trade policy). Advanced Logic, strategic resources, nanites and Zro are treated as stockpiles.
- [ ] **Planet net only** (no external empire income, which is not this planet's); starting stockpiles kept in memory only, not saved with the planet or the empire.
- [ ] **Only resources the planet produces or consumes** get a row (plus any with a starting stockpile already entered).

## P11.1 — Scenario A/B comparison (2026-11-21, GDD §6)
- [ ] **A is a pinned snapshot, B is the live planet**: no comparison between two saved planets (that would need running the engine on a second configuration); to compare a saved planet, load it, pin it, then load or edit the other.
- [ ] **Snapshot only in memory**: lost on reload, not saved with the planet nor exported.
- [ ] **Values compared**: planet net resources (without the empire's external income) plus stability, happiness, crime, free housing and pops. "Better" = more of a resource (also for upkeep-only resources), more stability / happiness / free housing / pops, less crime.

## P21 — Job swaps (2026-11-21, GDD §6.1)
- [ ] **Unmodelled swap conditions are never met** (origins, habitability, buildings / zones / features not in the simulator): the swap is listed in "Job swaps not applied", not applied. Opposite of building requirements, where they never block. Otherwise every Wilderness / origin swap (Photosymbiont...) would always apply.
- [ ] **Stacking "save exceptions"**: only the changes listed on the winning job ("With X swap conditions") are added; nothing else stacks.
- [ ] **Weight `null` = 0** for the swaps with no weight on the wiki (event jobs: Subterranean, Dimensional Portal, Vent Researcher, Titan Hunter... and Devoted Adept); ties keep data order.
- [ ] **Angler for any empire**: the wiki Empire column says Individualist, but its condition lists Marine Machines / Maritime Robotics (kept as in P10.10).
- [ ] **Hedonist / Tourist not applied**: civilians are a manual count, not jobs.
- [ ] **Jobs created directly as a swapped job stay as created** (Temple Priests, State Academy Educators, zone Gas Extractors, branch Merchants / Prosperity Preachers); their stacked changes still apply. In the game they may be base jobs that swap.
- [ ] **"A; B" in wiki conditions read as AND**, except where the items cannot hold together (Scrap Miner, Culture Worker, Zookeeper, Science Director, Merchant: one of). Dimensional Portal Researcher read as AND (both unmodelled).
- [ ] **Numistic Priest trade**: wiki +6 output and −2 upkeep stored as net +4.
- [ ] **Pyromancer**: the wiki lists the Death Chronicler block twice; counted once.
- [ ] **Untyped "+1 Research"** of Science Director / Noble Researcher / Tech Visionary / Technophant read as +1 of each research type.
- [ ] **"Job swaps not applied" list** includes a swap when every unmet condition involves an unmodelled one, even if a modelled alternative exists in the same "one of" (e.g. Science Director shows the Quantum Innovation Nexus while Technocracy is not chosen).
- [ ] **Civic job bonuses not modelled** (Catalytic Processing on Artificers / Pearl Divers, robotic founder species): listed as not modelled.
