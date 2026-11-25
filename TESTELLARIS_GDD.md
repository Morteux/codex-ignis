# GDD: Testellaris (Codex Ignis — `testellaris.html`)

Design rules of Testellaris, the Stellaris quiz game of Codex Ignis. Pending work lives in `tasks.md` (sections 40–43); finished tasks are in git. Decisions taken without the owner are listed in `DECISIONS_TO_REVIEW.md` (section T4001) until the owner confirms them; every rule marked **(proposal)** below is one of them.

- **Ruleset:** Stellaris PC 4.5.4 "Cygnus" (`stellaris-pc-4.5.4`), read from the installed game files with the extractor (`GAME_FILES_EXTRACTOR.md`).
- **Owner decisions (2026-11-22):** consecutive questions of increasing difficulty by tiers, 3 lives, lifelines (50 % and others), a shared top 10 "hall of fame" without accounts (MongoDB Atlas behind a Vercel function), questions in es/en/jp tagged with tier and DLC and citing their source, game names in the questions with the **official es/en/jp names of the game localisation** (only Testellaris; the rest of the site keeps English until P15).
- **Rule #1 (as in the simulator and the tech tree):** never invent facts, numbers or names. Every question comes from the extractor output (§5); a fact that cannot be traced to a game file and key is not a question.
- **Status:** design (T4001). Question bank: section 41; page: section 42; hall of fame backend: section 43.

## 1. Goal

A short, replayable quiz for people who know Stellaris: answer questions that get harder as you go, keep your lives, use each lifeline at the right moment and try to enter the shared hall of fame. Each question teaches something: after the game, every failed question shows its correct answer, a short explanation and its source.

## 2. Principles

- **Data-driven and versioned:** the question bank is data (`data/testellaris/<rulesetId>/questions.json`, **proposal**), never written inside the game logic. A new game version gets a new bank, generated again (T4111) and reviewed (T4109); the old one is kept.
- **Honest:** a question whose answer depends on things the extractor does not read (scripted effects, event chains, values computed in game) is not asked.
- **No build step**, ES modules, the shared page shell (`js/page-shell.js`) and the terminal look of the rest of the site.
- **Accessible:** keyboard (keys 1–4 or A–D for the answers, Tab and Enter for the rest), screen reader announcements of the result of each answer and of the lives left, contrast as the rest of the site, and **no time limit** (§3.6).
- **Testable:** every page task ends with browser checks in `tests/smoke/` (T4207), the bank has its own validator (T4101) and the API a local mock (T4301).

## 3. Rules

### 3.1 Tiers (proposal)

Five tiers, from facts every player meets in their first games to the ones only found reading the game files. The names are drafts for the interface (`js/i18n-testellaris.js`):

| Tier | Name (en, draft) | What it asks (rules for the generator, T4111) |
| --- | --- | --- |
| 1 | Primitive | Base game, playable, shown at empire creation or in the first hours: names and icons of ethics, base authorities, common origins and civics, resources, basic districts and buildings, tier 0–1 technologies. |
| 2 | Spacefaring | Requirements and relations of tier 1 facts: which ethics a civic needs, which authority an origin excludes, what a technology unlocks, which job a building gives; tier 2 technologies; DLC content that is common in play. |
| 3 | Galactic Power | Less common content: corporate, hive and machine civics, ascension variants of authorities, planet classes and modifiers, designations, edicts and policies; tier 3 technologies; prerequisites of a technology. |
| 4 | Ascended | Numbers: base costs, upkeep, modifier values, job outputs, technology cost and tier of rare technologies; requirements combining two conditions. |
| 5 | Fallen Empire | Obscure facts: non-playable or event items, dangerous and rare technologies, exact values of rare items, description texts ("which item has this description?"). |

The generator gives the tier by rule (set, field and how rare the item is: `playable`, rare/dangerous flags, DLC, technology tier); a hand-written question gives it by the same table. T4109 checks the balance per tier.

### 3.2 How the game advances (proposal)

- A game starts at tier 1. After **5 correct answers in the current tier** the game moves up one tier; wrong answers do not count towards that.
- Tier 5 has no ceiling: the game stays there until the lives run out or no question is left.
- Each question is drawn at random from the unasked questions of the current tier that pass the DLC filter (§4); a question is never repeated in the same game. **(Proposal)** The ids of the last 200 questions asked are kept in `localStorage` and avoided while others remain, so that consecutive games do not repeat the same questions.
- If the current tier runs out, the next question comes from the next tier up; if all the tiers from the current one up run out, the game ends as a **completed game** (§3.5).
- The four answers are shuffled every time a question is shown.

### 3.3 Lives

- 3 lives (owner). A wrong answer costs one life and shows the correct answer before the next question (with the short explanation).
- No way to win lives back **(proposal)**: it keeps scores comparable and the plausibility check simple (§7.3).

### 3.4 Lifelines (proposal for all but 50 %)

Each lifeline can be used **once per game**, only before answering, and only one per question **(proposal)**. Names are drafts with a Stellaris flavour:

| Lifeline | Name (en, draft) | Effect |
| --- | --- | --- |
| 50 % | Sensor Sweep | Removes two wrong answers (owner). |
| Skip | Hyperlane Jump | Replaces the question with another unasked one of the same tier; it counts neither as correct nor as wrong. |
| Second chance | Deflector Shields | After a wrong answer, that answer is crossed out and the player picks again without losing a life; a second wrong answer costs the life as usual. It is activated before answering. |

Rejected for now: "ask the audience" or "ask a friend" (there are no real answer statistics and inventing them would break rule #1), a hint with the source file (it gives the answer away in most generated questions), an extra life (§3.3).

### 3.5 Scoring and end of game (proposal)

- A correct answer is worth **100 × tier** points (100 at tier 1, 500 at tier 5). With 50 % on that question it is worth half. A skipped question gives 0.
- **Completed game** (no question left, §3.2): +250 points per life left.
- The game ends when the lives reach 0, when the bank is completed, or when the player chooses **Give up** (confirmation dialog of `js/confirm-dialog.js`); the score made so far counts in all three cases.
- End screen (T4204): score, tier reached, correct answers out of questions answered, lifelines used, and the failed questions with their correct answer, explanation and source.
- Ties in the top 10: higher tier reached, then fewer questions answered, then the earlier date.

### 3.6 Time (proposal)

No timer: the game is about knowledge, not reading speed, and a timer would need a way to extend it for accessibility (WCAG 2.2.1). It also means a player can look answers up; the hall of fame accepts that (it is a fan game without prizes). Alternative for the owner: an optional timed mode with its own top 10.

## 4. DLC filter

- The start screen (T4201) lists the DLCs of `dlc.json` that are installed with the game and `affects_gameplay` (26 in 4.5.4: expansions, story packs and species packs; the portrait packs do not change any question), grouped by category in release order, as the DLC bingo. All are checked by default, with "All" and "None" buttons; the choice is remembered in `localStorage`.
- A question is asked only if **every** DLC of its `dlc` list is checked; questions without DLC (base game) are always in.
- The `dlc` names of a question are the ones the extractor writes for its item (`host_has_dlc` triggers, the same strings as `dlc.json`'s `name`), so the filter needs no mapping table. A question about a DLC item whose data carries no DLC trigger (for example a building only reachable through a DLC origin) takes the DLC of the item that unlocks it, written by the generator or by hand with its source.
- If the filter leaves fewer than 20 questions in a tier **(proposal)**, the start screen warns that the game will finish early.
- **(Proposal)** One shared hall of fame for every filter; each entry stores how many DLCs were checked, shown next to the score.

## 5. Question format and sources

### 5.1 Format

One JSON record per question (the exact schema and its validator are T4101):

| Field | Content |
| --- | --- |
| `id` | Unique, stable across regenerations: `<topic>.<template or "hand">.<game id>` (**proposal**), so the "recently asked" list (§3.2) and bug reports survive a new version. |
| `tier` | 1–5 (§3.1). |
| `topic` | One of the topics of section 41: `origins`, `civics`, `ethics`, `government`, `technology`, `planets`, `economy`, `policies`, `shroud`… |
| `dlc` | List of DLC names (§4); empty for the base game. |
| `source` | Game file and key (`common/governments/civics/00_civics.txt`, `civic_corvee_system`), plus the localisation key when the fact is a text. |
| `text`, `answers`, `explanation` | es/en/jp each: the question, its four answers and a one- or two-sentence explanation. |
| `correct` | Index of the correct answer in `answers` (the page shuffles them). |
| `icon` | Optional path of an icon in the assets repository (`STELLARIS_ASSETS_BASE`) shown with the question, when the question is about an item that has one and the icon does not give the answer away. |

### 5.2 Writing rules

- Four **distinct** answers, exactly one correct by the data. Wrong answers come from the same kind of item (other civics, other technologies, other values of the same field) and must be checkably wrong from the same data: no "trick" answers that are also partly true.
- Game names always with the official name of the game localisation in each language (extractor `localisation/`), never translated by hand. Texts around them are written in each language.
- No negative questions ("which is NOT…") unless the four answers are clear; no "all of the above".
- Numbers as the game shows them (percentages for multipliers: `0.15` → 15 %).
- Hand-written questions follow the same format and cite their source the same way; a question without a source fails the validator.

### 5.3 Sources

- **Only the extractor output** (owner): `data/generated/<rulesetId>/*.json` and its localisation, including the description texts. Never the wiki, never memory.
- New topics need a new extractor first (T4110), added to `extract_all.py`.
- When the data and what the game shows might differ (values changed by scripted effects or by other modifiers), the question is not asked.

## 6. Languages

- Interface: es/en/jp in a new area `js/i18n-testellaris.js` of `js/i18n.js`, with the same keys in the three languages (checked by the i18n smoke tests).
- Questions: the three languages inside each record (§5.1), so a question is never shown half translated. Changing the language during a game re-renders the current question in the new language without changing it, its answer order or the score.
- Official names of the game localisation (`spanish.json`, `english.json`, `japanese.json` of the extractor); if a name is missing in a language, the question is not generated (the validator requires every language).

## 7. Hall of fame

### 7.1 Rules

- One shared **top 10**, no accounts (owner). Each entry: name, score, tier reached, questions answered, correct answers, DLCs checked (§4), ruleset and date.
- **Name:** 1 to **10 characters** (owner), counted as user-perceived characters, so 10 Japanese characters are allowed as well as 10 Latin ones. Trimmed, NFC-normalised, inner spaces collapsed. Allowed: letters and digits of any script, space, `-`, `_` and `.` **(proposal)**; no control or invisible characters, no emoji **(proposal)**.
- A score is offered to the hall of fame only if it enters the current top 10; the game asks for the name on the end screen (T4206). Names are not unique.
- **(Proposal)** One board per ruleset: when the bank moves to a new game version the old board is kept read-only and a new one starts.

### 7.2 Backend (owner decision, section 43)

- Vercel serverless function `api/hall-of-fame.js`: `GET` returns the top 10, `POST` sends one entry. MongoDB Atlas through the `MONGODB_URI` environment variable, never in the repository. Only the top 10 is kept.
- If the API cannot be reached, the game uses a **local top 10** in `localStorage` (T4205) and says so; nothing is queued to be sent later **(proposal)**.

### 7.3 Anti-abuse (T4302)

The game runs in the browser, so a determined player can always forge a score; the aim is to stop casual abuse and keep the board readable:

- **Payload validation:** fixed fields and types, body under 1 KB, unknown fields rejected.
- **Name rules:** §7.1, plus a word filter (insults and slurs in es/en/jp, kept in a server-side list, matched after removing accents, spaces and look-alike characters). A rejected name gets a generic message and can be changed.
- **Plausible score:** the server recomputes the maximum score from the reported counts (correct answers per tier, 5 needed per tier to move up, 50 % halves one answer, completion bonus only with no question left) and rejects any score above it or any count above the bank size of the ruleset.
- **Rate limit (proposal):** at most 5 `POST` per 10 minutes per client, keyed by a salted hash of the IP address that expires after 24 hours (TTL index); the raw IP is never stored.
- **Moderation:** the owner can delete an entry directly in MongoDB Atlas; no admin page in this version **(proposal)**.
- **Privacy:** the stored data (name, score, date, hashed IP for 24 h) must be described in `privacy.html` before the hall of fame is published (T4304).

## 8. Page (section 42)

1. **Start screen:** title, short rules, DLC filter (§4), Start button, the top 10.
2. **Question screen:** tier and its name, question number, score, lives (3 icons with text), the three lifelines (used ones disabled), the question (and its icon), four answer buttons, Give up.
3. **After each answer:** correct/wrong, the correct answer and the short explanation; Next button (keyboard: Enter).
4. **End screen:** §3.5, then the name input if the score enters the top 10 (§7.1), and Play again.

Mobile first (320 px without horizontal scroll, answer buttons of at least 44 px), linked from the home page (T4201).
