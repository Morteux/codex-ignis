# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

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
