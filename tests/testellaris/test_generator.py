"""Testellaris question generator (T4111): rules of the templates and the facts of the bank against the data."""
import os, sys, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/testellaris")
import generate_questions as gq  # noqa: E402
import question_bank as qb  # noqa: E402

DATA = f"{ROOT}/data/generated/{qb.DEFAULT_RULESET}"
BASE_TEMPLATES = {"tech_tier", "tech_cost", "tech_prerequisite", "building_tech", "building_job", "building_upgrade",
                  "ethic_opposite", "civic_ethic_required", "civic_ethic_forbidden", "civic_dlc", "origin_dlc"}


class RulesTest(unittest.TestCase):
    def test_negated_dlc_is_not_the_dlc_of_the_item(self):
        item = {"dlc": ["Megacorp"], "playable": 'NOT = {\n\thost_has_dlc = "Megacorp"\n}'}
        self.assertEqual(gq.condition_check(item, ("playable",)), (True, []))
        self.assertIsNone(gq.single_dlc(item, ("playable",)))

    def test_single_dlc(self):
        self.assertEqual(gq.single_dlc({"dlc": ["Utopia"], "playable": 'host_has_dlc = "Utopia"'}, ("playable",)), "Utopia")
        alt = {"dlc": ["Utopia", "Megacorp"], "playable": 'OR = {\n\thost_has_dlc = "Utopia"\n\thost_has_dlc = "Megacorp"\n}'}
        self.assertIsNone(gq.single_dlc(alt, ("playable",)))
        either = {"dlc": ["Utopia"], "playable": 'OR = {\n\thost_has_dlc = "Utopia"\n\thas_ethic = ethic_militarist\n}'}
        self.assertIsNone(gq.single_dlc(either, ("playable",)))

    def test_unresolved_scripted_trigger_makes_an_item_unusable(self):
        """Data without the trigger map of dlc.json (before T2527): any has_… = yes may hide a DLC."""
        saved, gq.DLC_TRIGGERS = gq.DLC_TRIGGERS, None
        try:
            self.assertFalse(gq.condition_check({"dlc": [], "playable": "has_lithoids = yes"}, ("playable",))[0])
            self.assertTrue(gq.condition_check({"dlc": ["Megacorp"], "playable": "has_megacorp_dlc = yes"}, ("playable",))[0])
        finally:
            gq.DLC_TRIGGERS = saved

    def test_scripted_dlc_triggers(self):
        """T2527: the scripted triggers of dlc.json are expanded, negations and alternatives kept."""
        t = {"has_lithoids": [{"dlc": "Lithoids Species Pack", "negated": False, "alternative": False}],
             "has_not_megacorp_dlc": [{"dlc": "Megacorp", "negated": True, "alternative": False}],
             "has_genetic_dlc": [{"dlc": "Plantoids Species Pack", "negated": False, "alternative": True},
                                 {"dlc": "Lithoids Species Pack", "negated": False, "alternative": True}]}
        lith = {"dlc": ["Lithoids Species Pack"], "playable": "has_lithoids = yes\nis_gestalt = no"}
        self.assertEqual(gq.condition_check(lith, ("playable",), t), (True, ["Lithoids Species Pack"]))
        self.assertEqual(gq.single_dlc(lith, ("playable",), t), "Lithoids Species Pack")
        self.assertEqual(gq.condition_check({"dlc": ["Megacorp"], "playable": "has_not_megacorp_dlc = yes"}, ("playable",), t), (True, []))
        self.assertEqual(gq.condition_check({"dlc": ["Megacorp"], "playable": "has_not_megacorp_dlc = no"}, ("playable",), t), (True, ["Megacorp"]))
        self.assertIsNone(gq.single_dlc({"dlc": ["Lithoids Species Pack"], "playable": "NOT = { has_lithoids = yes }"}, ("playable",), t))
        self.assertIsNone(gq.single_dlc({"dlc": ["Plantoids Species Pack", "Lithoids Species Pack"], "playable": "has_genetic_dlc = yes"}, ("playable",), t))
        self.assertFalse(gq.condition_check({"dlc": ["has_unknown_dlc"], "playable": "has_unknown_dlc = yes"}, ("playable",), t)[0])
        d = gq.Data(DATA)
        self.assertEqual(gq.single_dlc(d.by_id("civics")["civic_selective_kinship"], gq.CIVIC_FIELDS), "Lithoids Species Pack")

    def test_ethics_rules(self):
        text = "ethics = {\n\tOR = {\n\t\ttext = x\n\t\tvalue = ethic_militarist\n\t\tvalue = ethic_fanatic_militarist\n\t}\n\tNOT = {\n\t\tvalue = ethic_fanatic_xenophile\n\t}\n}\ncivics = {\n\tNOT = {\n\t\tvalue = civic_x\n\t}\n}"
        self.assertEqual(gq.ethics_rules(text), ([{"ethic_militarist", "ethic_fanatic_militarist"}], {"ethic_fanatic_xenophile"}))
        self.assertIsNone(gq.ethics_rules("OR = {\n\tethics = {\n\t\tvalue = ethic_militarist\n\t}\n\thas_ethic = ethic_pacifist\n}"))

    def test_repeated_names_are_not_asked(self):
        d = gq.Data(DATA)
        self.assertIsNone(d.name("technologies", "tech_archaeostudies"))  # two technologies share its name
        self.assertEqual(d.name("technologies", "tech_lasers_1")["en"], "Red Lasers")

    def test_cap_per_template_and_tier(self):
        qs = [{"id": f"technology.tech_tier.t{i}", "tier": 1} for i in range(10)]
        self.assertEqual(len(gq.capped(qs, 4)), 4)
        self.assertEqual(gq.capped(qs, 4), gq.capped(list(reversed(qs)), 4))


class BankFactsTest(unittest.TestCase):
    """Every generated question states what the extractor data says."""

    @classmethod
    def setUpClass(cls):
        cls.bank = qb.load(qb.bank_path())
        cls.d = gq.Data(DATA)

    def correct(self, q, lang="en"):
        return q["answers"][lang][q["correct"]]

    def test_bank_is_up_to_date(self):
        self.assertEqual(gq.generate(DATA, self.bank), self.bank, "run python tools/testellaris/generate_questions.py")

    def test_hand_questions_are_kept(self):
        hand = dict(self.bank["questions"][0], id="technology.hand.test_keep")
        wiki = dict(self.bank["questions"][0], id="technology.wiki.test_keep", source={"kind": "wiki", "article": "Technology", "section": "Technology"})
        bank = dict(self.bank, questions=self.bank["questions"] + [hand, wiki])
        out = gq.generate(DATA, bank)["questions"]
        self.assertIn(hand, out)
        self.assertIn(wiki, out)

    def test_categories(self):
        """T4403: the topic gives the category, a template may override it; every template maps to a real one."""
        self.assertEqual(gq.category_of("economy", "building_job"), "engineering")
        self.assertEqual(gq.category_of("technology", "tech_prerequisite"), "physics")
        self.assertEqual(gq.category_of("technology", "tech_cost"), "engineering")
        self.assertEqual(gq.category_of("civics", "civic_dlc"), "unity")
        self.assertLessEqual(set(gq.TEMPLATE_CATEGORY.values()), set(qb.CATEGORIES))
        for q in self.bank["questions"]:
            template = q["id"].split(".")[1]
            if template not in ("hand", qb.WIKI_TEMPLATE):
                self.assertEqual(q["category"], gq.category_of(q["topic"], template), q["id"])

    def test_every_template_and_tier_present(self):
        templates = {q["id"].split(".")[1] for q in self.bank["questions"]}
        self.assertTrue(BASE_TEMPLATES <= templates, templates)
        self.assertEqual({q["tier"] for q in self.bank["questions"]}, set(qb.TIERS))

    def test_facts_match_the_data(self):
        techs, buildings = self.d.by_id("technologies"), self.d.by_id("buildings")
        tech_by_name = {self.d.name("technologies", k)["en"]: k for k in techs if self.d.name("technologies", k)}
        sources = {(x.get("file"), x["id"]) for s in self.d.manifest["sets"] for x in self.d.items(s)}
        for q in self.bank["questions"]:
            if qb.is_wiki(q) and "file" not in q["source"]:
                continue  # a wiki fact the extractor data does not hold (GDD §5.3)
            with self.subTest(q["id"]):
                self.assertIn((q["source"]["file"], q["source"]["key"]), sources)
        for q in self.bank["questions"]:
            topic, template, key = q["id"].split(".", 2)
            if template not in BASE_TEMPLATES:
                continue  # the other templates have their own test file
            with self.subTest(q["id"]):
                self.assertEqual(q["source"]["key"], key)
                if template == "tech_tier":
                    self.assertEqual(self.correct(q), str(techs[key]["tier"]))
                elif template == "tech_cost":
                    self.assertEqual(self.correct(q), str(techs[key]["cost"]))
                elif template == "tech_prerequisite":
                    answers = [tech_by_name[a] for a in q["answers"]["en"]]
                    self.assertIn(answers[q["correct"]], techs[key]["prerequisites"])
                    for i, a in enumerate(answers):
                        if i != q["correct"]:
                            self.assertNotIn(a, techs[key]["prerequisites"])
                elif template == "building_tech":
                    self.assertEqual(buildings[key]["prerequisites"], [tech_by_name[self.correct(q)]])
                elif template == "building_upgrade":
                    self.assertEqual([self.d.name("buildings", u)["en"] for u in buildings[key]["upgrades"]], [self.correct(q)])
                elif template == "building_job":
                    self.assertIn(self.correct(q), [self.d.loc["en"]["jobs"].get(j) for j in buildings[key]["jobs"]])
                elif template in ("civic_dlc", "origin_dlc"):
                    item = self.d.by_id("civics" if template == "civic_dlc" else "origins")[key]
                    self.assertEqual(item["dlc"], [self.correct(q)])
                    self.assertEqual(q["dlc"], item["dlc"])
                for lang in qb.LANGS:  # the official name of the item is in the question
                    set_name = {"technology": "technologies", "economy": "buildings", "ethics": "ethics", "civics": "civics", "origins": "origins"}[topic]
                    self.assertIn(self.d.loc[lang][set_name][key].strip(), q["text"][lang])


if __name__ == "__main__":
    unittest.main()
