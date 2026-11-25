"""Policy and edict questions (T4107): the condition readers and each answer against the data."""
import unittest

from bank_case import BankCase
import q_policies as qp


class ReaderTest(unittest.TestCase):
    def test_blocked_ethics(self):
        self.assertEqual(qp.blocked_ethics('NOR = {\n\thas_ethic = "ethic_pacifist"\n\thas_ethic = ethic_fanatic_pacifist\n}'),
                         {"ethic_pacifist", "ethic_fanatic_pacifist"})
        self.assertEqual(qp.blocked_ethics("is_xenophobe = no"), {"ethic_xenophobe", "ethic_fanatic_xenophobe"})
        self.assertEqual(qp.blocked_ethics("OR = {\n\thas_ethic = ethic_militarist\n}"), set())

    def test_required_civics(self):
        self.assertEqual(qp.required_civics("OR = {\n\thas_valid_civic = civic_a\n\thas_valid_civic = civic_b\n}"), {"civic_a", "civic_b"})
        self.assertEqual(qp.required_civics("OR = {\n\thas_valid_civic = civic_a\n\tis_homicidal = yes\n}"), set())


class PolicyFactsTest(BankCase):
    def english(self, set_name, item_id):
        return self.d.loc["en"][set_name].get(item_id, "").strip()

    def policy(self, q):
        return self.d.by_id("policies")[q["id"].split(".")[2]]

    def option(self, q):
        return next(o for o in self.policy(q)["options"] if o["id"] == q["id"].split(".")[3])

    def edict(self, q):
        return self.d.by_id("edicts")[q["id"].split(".")[2]]

    def edict_named(self, name):
        return self.d.by_id("edicts")[self.ids("edicts")[name]]

    def test_options(self):
        for q in self.questions("policy_option", 10):
            own = {self.english("policies", o["id"]) for o in self.policy(q)["options"]}
            self.assert_one_true(q, lambda a: a in own)
        for q in self.questions("option_policy", 10):
            name = self.english("policies", q["id"].split(".")[3])
            self.assert_one_true(q, lambda a: name in {self.english("policies", o["id"])
                                                       for o in self.d.by_id("policies")[self.ids("policies")[a]]["options"]})

    def test_option_rules(self):
        for q in self.questions("option_ethic", 8):
            o = self.option(q)
            blocked = qp.blocked_ethics(o.get("valid")) | qp.blocked_ethics(o.get("potential"))
            self.assert_one_true(q, lambda a: self.ids("ethics")[a] in blocked)
        for q in self.questions("option_civic", 2):
            o = self.option(q)
            needed = qp.required_civics(o.get("valid")) or qp.required_civics(o.get("potential"))
            self.assert_one_true(q, lambda a: self.ids("civics")[a] in needed)

    def test_edict_values(self):
        for q in self.questions("edict_cost", 10):
            self.assertEqual(float(self.correct(q)), next(iter(self.edict(q)["cost"].values())))
        for q in self.questions("edict_lock", 8):
            self.assertEqual(self.correct(q), str(self.edict(q)["edict_lock_in_months"]))
        for q in self.questions("edict_same_resource", 10):
            resource = set(self.edict(q)["upkeep"])
            self.assert_one_true(q, lambda a: set(self.edict_named(a)["upkeep"]) == resource)
        for q in self.questions("edict_wartime", 3):
            self.assert_one_true(q, lambda a: self.edict_named(a)["is_wartime_edict"])

    def test_edict_requirements(self):
        for template, set_name, at_least in (("edict_ethic", "ethics", 4), ("edict_authority", "authorities", 5),
                                             ("edict_origin", "origins", 1)):
            for q in self.questions(template, at_least):
                lines = qp.top_lines(self.edict(q)["potential"])
                needed = {f"ethic_{qp.ETHIC_TRIGGERS[k]}" for k, _ in lines if k in qp.ETHIC_TRIGGERS}
                needed |= {qp.AUTHORITY_TRIGGERS[k] for k, _ in lines if k in qp.AUTHORITY_TRIGGERS}
                needed |= {str(v) for k, v in lines if k == "has_origin"}
                self.assert_one_true(q, lambda a: self.ids(set_name).get(a) in needed)
        for q in self.questions("ambition_technology", 2):
            self.assertEqual(self.edict(q)["group"], "ambitions")
            self.assertEqual(self.correct(q), self.english("technologies", "tech_ascension_theory"))
        for q in self.questions("edict_dlc", 5):
            self.assertEqual(q["dlc"], self.edict(q)["dlc"])


if __name__ == "__main__":
    unittest.main()
