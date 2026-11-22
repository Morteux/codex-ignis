# Decisions to review

Decisions Claude took on its own while implementing tasks, pending the owner's review. When the owner confirms or changes one, move it to `PLANET_SIM_GDD.md` (as an owner decision) and remove it from here. Newest first.

## P23.1 — Refactoring audit of the whole site (2026-11-22)
- [ ] **Duplicated page shell**: header, language buttons and the `data-i18n` / `data-i18n-attr` sweep are copied in `legal.js`, `bingo.js`, `planet-sim.js` and (by element id) `app.js`; five simulator modules listen to the language buttons on their own. Kept in T2302 (shared shell), with the details noted there.
- [ ] **Duplicated helpers**: the sign/number/percent formatters and the resource/job name lookups exist in three simulator modules → new task T2309. The modal scaffolding (overlay, Escape, focus trap, focus return) exists three times (`confirmChoice`, `promptText`, wiki lightbox) → new task T2310.
- [ ] **Oversized modules**: `i18n.js` (424 KB, T2304), `content.js` (280 KB), `planet-sim.js` (229 KB, T2303, with an ~850-line `computeTotals()`), `planet-data.js` (107 KB), `styles.css` (65 KB, T2305), `tests/policies-smoke.py` (142 KB, one 1400-line function, T2306). **`content.js` and `planet-data.js` are not split**: they are data, the wiki search needs every article loaded at once, and splitting them would only add requests.
- [ ] **Dead code** found by a scan of exports and top-level functions: four exports used nowhere and ~25 exports used only in their own file (listed under T2307); no unused top-level function and no JS file outside every page graph.

## P22.9 — Load performance (2026-11-22)
- [ ] **Measured with `tests/load-budget.mjs`** (static import graph + stylesheet + font + local images in the HTML; raw / gzip): wiki 845 / 227 KB, bingo 571 / 165 KB, simulator 1346 / 363 KB (33 modules), tech tree and legal pages ~533 / 156 KB, 404 3 / 1 KB. `js/i18n.js` (424 / 119 KB) is ~75% of every page except the simulator and the wiki, where `content.js` (280 / 61 KB) and `planet-sim.js` (229 / 58 KB) follow. Splitting `i18n.js` per page is already T2304.
- [ ] **Only lazy-loading was added**: the 12 static heading icons of the simulator tabs hidden at start (Library, Empire, Celestial body, Edicts, Branch offices) and the ethics/authority icons of the Empire tab. Every other script-created image was already lazy; the bingo keeps `eager` where the PNG download needs the images.
- [ ] **No module was removed from any page**: every module in each graph is used by that page. `ads.js` + `ads-config.js` (~2 KB) stay on the wiki so ads can be turned on by config alone.
- [ ] **Not done, proposed as T2308**: the Orbitron font as WOFF2 (needs the `brotli` Python package, not installed) and `<link rel="modulepreload">` for the simulator's five-level import chain.

## P22.8 — Page metadata of every page (2026-11-22)
- [ ] **Same metadata on every page**: `<title>`, description, PNG favicon (it was declared `image/x-icon` but the file is a PNG), `theme-color`, Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:locale`, `og:image`), `twitter:card` and `rel="canonical"`. The 404 page gets a description (new key `notFoundMetaDescription`), `theme-color`, Open Graph and `noindex`, but no canonical or `og:image`. The index title and description are now also marked with `data-i18n` / `data-i18n-attr`.
- [ ] **`og:title`, `og:description` and `og:locale` follow the language** through `syncSocialMeta()` in `js/i18n.js` (es_ES / en_US / ja_JP), called by `app.js`, `bingo.js`, `planet-sim.js` and `legal.js`. Crawlers that do not run JavaScript see the Spanish text.
- [ ] **Canonical and `og:image` are relative** (`bingo`, `./`, `img/Ignis Stellaris.png`) because the production domain is not in the repository. Social crawlers need absolute URLs: once the domain is known, replace them with `https://<domain>/...` and add `og:url`. The image used is `img/Ignis Stellaris.png`; pick a 1200×630 card if you want a better preview.

## P22.7 — i18n review of the wiki, bingo and legal pages (2026-11-22)
- [ ] **Audit tool** `tests/i18n-audit.mjs` (`node tests/i18n-audit.mjs .`): checks that es/en/jp of `js/i18n.js` have the same 2048 keys, that every key used by `data-i18n*`, `t(...)` and the bingo data exists in the three languages, and lists the articles of `js/content.js` without a translation. No hard-coded interface text was found in the wiki, bingo, legal, 404 and tech tree pages (the Spanish text in the HTML is the default that `applyStaticStrings()` / `js/legal.js` replace), so no code changed.
- [ ] **Articles of `content.js` without an English and a Japanese translation** (their `i18n` has empty `en: {}` / `jp: {}` placeholders, so they show in Spanish in every language; not machine-translated, they need a human translation): `diseño-flotas-fauna-espacial` (39 blocks), `flotas-contra-crisis` (43 blocks), `lista-de-deseos-ignis` (hidden easter egg, 4 blocks). The other 12 articles have en and jp with the same number of blocks as the Spanish one.

## P22.6 — Accessibility pass of the other pages (2026-11-22)
- [ ] **`<html lang="ja">` for Japanese** (new `htmlLangCode()` in `js/i18n.js`): the site's own code stays `jp` (buttons, storage, `strings.jp`), but "jp" is not a language tag, so screen readers did not switch to Japanese. Applied to the simulator too, for consistency.
- [ ] **A Japanese browser (`ja-JP`) now opens the site in JP**: `detectInitialLang()` compared "ja" with "jp" and fell back to Spanish.
- [ ] **Landmarks**: `<main>` used to wrap the whole page (header and footer included). The page wrapper is now a `<div>` (same classes), the header and footer are outside `<main>`; on the legal pages and the 404 the language bar is the `<header>` and the eyebrow + title moved into `<main>` (class `legal-heading`, same look).
- [ ] **Wiki images and quote portraits are buttons** (`entry-image-zoom`, `entry-quote-zoom`) so the lightbox opens with the keyboard; the lightbox is a modal dialog (new key `a11yImageViewer`), focus goes to Close, Tab stays on it and closing returns focus. Images without alt text get "Enlarge image" (new key `a11yZoomImage`).
- [ ] **ARIA fixes**: the "online" indicator gets `role="status"`; the entry count uses a hidden text label instead of `aria-label` on a `<span>`; the inline ad slot is an `<aside>`.
- [ ] **Contrast**: the search placeholder goes from #5c7765 (3.8:1) to #6f8c78 (5:1); everything else passed. The highlight colours of `js/highlight-config.js` were left alone (owner's palette, new task T2211).
- [ ] **Visible focus on the wiki search**: the search box shows the focus ring on its frame (the input itself has no outline).
- [ ] **Brand link at least 24 px tall** on mobile (with `lang="ja"` it measured 23 px).

## P22.5 — Mobile layout of the other pages (2026-11-22)
- [ ] **No page overflowed sideways** at 320/375 px in es/en/jp; the only issue was **tap targets under 24 px** (WCAG 2.5.8): header nav links (13 px tall), footer links and the wiki search box. Under 700 px they now get at least 24 px of height (desktop unchanged).
- [ ] **Wiki on mobile scrolls to the article** after tapping an index entry (the article is below the whole index in the one-column layout). Only for index taps under 700 px; opening by URL or the back button does not scroll.

## P22.3 — Legal pages, 404 and tech tree placeholder QA (2026-11-22)
- [ ] **404 at nested paths**: Vercel serves `404.html` for any missing URL keeping the path, so at `/a/b/missing` its relative `styles.css` and `js/legal.js` resolved to `/a/b/…` and the page showed unstyled and untranslated. It now adds `<base href="/">` (only over http/https, so it still works from disk) and injects the stylesheet, icon and script after it. Without JavaScript the 404 page is unstyled.
- [ ] **`hasAdConsent()` returns false** (was true) until a CMP is integrated: setting `adsConfig.enabled = true` alone no longer loads AdSense without consent. Activating ads now needs the CMP check too.
- [ ] **Tech tree placeholder translated**: new keys `techTreePageTitle`, `techTreeMetaDescription`, `techTreeHeading` ("Tech Tree" in every language, like the nav) and a proposed "under construction" line `techTreeComingSoon` (es/en/jp).

## P22.2 — Bingo QA (2026-11-22)
- [ ] **Icons requested with CORS** (`crossOrigin="anonymous"`): without it the remote icons tainted the canvas and the PNG download failed silently. This relies on the asset API (GitHub Pages) sending `Access-Control-Allow-Origin: *`; if a future host does not, the icons would stop showing (could not be checked from here: no network access).
- [ ] **The download no longer hangs on a missing icon** (it waited forever for an image that had already failed); the missing cell is drawn empty in the PNG.
- [ ] **A missing icon shows the name on its card** (class `is-image-missing`) instead of a broken image.
- [ ] **Download error message** (new key `bingoDownloadError`, shown under the controls in a `role=status` line) if the PNG cannot be generated.
- [ ] **PNG title from `bingoHeading`** (upper case) instead of a hard-coded es/en/jp map; same text as before.
- [ ] **The grid starts from the select value**, so a browser that restores the select after a reload no longer shows origins under "Principles".

## P22.1 — Wiki QA (2026-11-22)
- [ ] **Easter eggs need 3+ characters for partial matches**: a query revealed an easter egg if any trigger *contained* it, so typing "a", "s" or "3" listed every secret entry. Now a query shorter than 3 characters only reveals one when it contains a whole trigger (e.g. "30"); "mugan", "wishlist" or "clase 30" still work.
- [ ] **Triggers of a translation count**: the JP translation of "Singularidad de clase 30" had its own `triggers` (特異点, クラス30) that were ignored; triggers in `i18n.<lang>` are now added to the original ones (in every language). Its stray `hidden`/`icon` fields in the JP translation were removed (unused).
- [ ] **Fixed EN/JP title of "Diseño de flotas mecánicas"**: it was a copy of the titans article title ("About titans and their auras"). Proposed: EN "Mechanical Fleet Design", JP "機械艦隊の設計" (same pattern as 生体艦隊の設計). The article text was already the right one.
- [ ] **Translated quotes get the portrait of the Spanish one** (MUGANI, Class 30 Singularity), with EN/JP `portraitAlt` "Prethoryn Queen" / "Contingency" / "コンティンジェンシー".
- [ ] **Missing images show a notice** ("Image not available: <alt>", new key `imageMissing`) instead of a broken image; a missing quote portrait is just hidden.
- [ ] **Hashes**: only `#/slug` opens an entry; other hashes (the skip link's `#archivo`) no longer close the open article.
- [ ] **Search marker** ignores accents like the search itself ("dano" marks "daño") and, like the word colours, never touches tags, attributes or entities (searching "color" or "https" used to break the coloured words and links).
- [ ] **Renamed `img/bionaves/Tejedor de apoyo con evasion y dano de largo alcance..png`** (double dot) so the article finds it.

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
