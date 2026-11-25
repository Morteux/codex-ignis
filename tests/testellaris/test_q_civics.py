"""Origin and civic questions (T4102): the rules engine and each answer against the data."""
import re, unittest

from bank_case import BankCase, DATA, gq
import rules as rl


def mentions(item, value):
    """True if the conditions of an item name a value."""
    text = " ".join(item.get(f) or "" for f in ("potential", "possible"))
    return re.search(rf"= {value}\b", text) is not None


class RulesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        d = gq.Data(DATA)
        cls.empires = rl.Empires(d)
        cls.items = {s: d.by_id(s) for s in ("civics", "origins")}

    def key(self, item_id, set_name="civics"):
        return (item_id, set_name, rl.read(self.items[set_name][item_id]))

    def test_ethic_combinations(self):
        self.assertIn(frozenset(["ethic_gestalt_consciousness"]), self.empires.combos)
        self.assertIn(frozenset(["ethic_fanatic_militarist", "ethic_xenophile"]), self.empires.combos)
        self.assertNotIn(frozenset(["ethic_militarist", "ethic_pacifist", "ethic_xenophile"]), self.empires.combos)
        self.assertFalse(any(len(c) == 4 for c in self.empires.combos))

    def test_authority_and_ethic(self):
        cult = self.key("civic_imperial_cult")
        self.assertTrue(self.empires.satisfiable([cult], authority="auth_imperial"))
        self.assertFalse(self.empires.satisfiable([cult], authority="auth_democratic"))
        self.assertFalse(self.empires.satisfiable([cult], ethic="ethic_materialist"))

    def test_incompatible_civics(self):
        purifiers = self.key("civic_fanatic_purifiers")
        self.assertFalse(self.empires.satisfiable([purifiers, self.key("civic_pompous_purists")]))
        self.assertTrue(self.empires.satisfiable([purifiers, self.key("civic_police_state")]))

    def test_unreadable_conditions_are_not_guessed(self):
        self.assertIsNone(rl.read({"potential": "has_global_flag = x", "possible": ""}))

    def test_event_civics_are_not_playable(self):
        self.assertFalse(gq.playable(self.items["civics"]["civic_psionic_sovereign"]))


class CivicFactsTest(BankCase):
    def item(self, set_name, name):
        return self.d.by_id(set_name)[self.ids(set_name)[name]]

    def test_kinds(self):
        for template, own in (("civic_kind", "civics"), ("origin_kind", "origins")):
            for q in self.questions(template):
                self.assert_one_true(q, lambda a: a in self.ids(own))

    def test_group_and_not_playable(self):
        for q in self.questions("civic_group", 10):
            auth = self.d.by_id("civics")[self.key(q)]["potential"]
            self.assertIn("authority", auth)
            self.assertEqual(self.ids("civics")[self.correct(q)], self.key(q))
        for q in self.questions("civic_not_playable"):
            self.assert_one_true(q, lambda a: not gq.playable(self.item("civics", a)))
        for q in self.questions("origin_not_playable"):
            self.assert_one_true(q, lambda a: "always = no" in (self.item("origins", a).get("playable") or ""))

    def test_incompatible(self):
        for template, set_name in (("civic_incompatible", "civics"), ("origin_incompatible_civic", "origins")):
            for q in self.questions(template, 10):
                x = self.d.by_id(set_name)[self.key(q)]
                self.assert_one_true(q, lambda a: mentions(x, self.ids("civics")[a])
                                     or mentions(self.item("civics", a), x["id"]))
                self.assert_named(q, set_name, x["id"])

    def test_ethics(self):
        for q in self.questions("civic_requires_ethic", 5):
            item = self.d.by_id("civics")[self.key(q)]
            self.assertEqual(self.ids("civics")[self.correct(q)], item["id"])
            names = [e for e, i in self.ids("ethics").items() if mentions(item, i) and e in q["text"]["en"]]
            self.assertTrue(names, q["id"])
        for template in ("origin_ethic_required", "origin_ethic_forbidden"):
            for q in self.questions(template):
                item = self.d.by_id("origins")[self.key(q)]
                self.assertTrue(mentions(item, self.ids("ethics")[self.correct(q)]), q["id"])

    def test_authorities(self):
        empires = rl.Empires(self.d)
        for template, set_name in (("civic_authority", "civics"), ("origin_authority", "origins")):
            for q in self.questions(template):
                key = (self.key(q), set_name, rl.read(self.d.by_id(set_name)[self.key(q)]))
                self.assert_one_true(q, lambda a: empires.satisfiable([key], authority=self.ids("authorities")[a]))

    def test_combos(self):
        empires = rl.Empires(self.d)
        for template, set_name in (("civic_combo", "civics"), ("origin_combo", "origins")):
            for q in self.questions(template):
                key = (self.key(q), set_name, rl.read(self.d.by_id(set_name)[self.key(q)]))

                def allowed(answer):
                    auth, ethic = answer.split(" + ")
                    return empires.satisfiable([key], authority=self.ids("authorities")[auth], ethic=self.ids("ethics")[ethic])
                self.assert_one_true(q, allowed)

    def test_corporate_version_and_start_planet(self):
        for q in self.questions("civic_corporate_version", 5):
            other = self.ids("civics")[self.correct(q)]
            civics = self.d.by_id("civics")
            self.assertTrue(civics[self.key(q)]["alternate_civic_version"] == other or civics[other]["alternate_civic_version"] == self.key(q))
        for q in self.questions("origin_start_planet"):
            pc = self.d.by_id("origins")[self.key(q)]["starting_colony"]
            self.assertEqual(self.correct(q), self.d.loc["en"]["planet_classes"][pc])


if __name__ == "__main__":
    unittest.main()
