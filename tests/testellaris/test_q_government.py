"""Ethics and government questions (T4103): each answer against the data."""
import unittest

from bank_case import BankCase
from test_q_civics import mentions
import rules as rl


class GovernmentFactsTest(BankCase):
    def auth(self, name):
        return self.d.by_id("authorities")[self.ids("authorities")[name]]

    def pair(self, answer):
        """The ethic ids of an answer "A + B"."""
        return [self.ids("ethics")[n] for n in answer.split(" + ")]

    def legal(self, answer):
        ethics = [self.d.by_id("ethics")[e] for e in self.pair(answer)]
        return sum(e["cost"] for e in ethics) == 3 and len({e["category"] for e in ethics}) == 2

    def test_points_and_combinations(self):
        for q in self.questions("ethic_points", 10):
            self.assertEqual(self.correct(q), str(self.d.by_id("ethics")[self.key(q)]["cost"]))
        for q in self.questions("ethic_combination", 10):
            self.assert_one_true(q, self.legal)
        for q in self.questions("ethic_combination_illegal", 10):
            self.assert_one_true(q, lambda a: not self.legal(a))

    def test_features_and_terms(self):
        checks = {"heir": ("has_heir", True), "re_election": ("re_election_allowed", True), "mandates": ("uses_mandates", True),
                  "no_factions": ("has_factions", False), "no_reform": ("can_reform", False)}
        for q in self.questions("authority_feature", 5):
            field, wanted = checks[q["id"].split(".")[2]]
            self.assert_one_true(q, lambda a: self.auth(a)[field] is wanted)
        for q in self.questions("authority_term"):
            self.assertEqual(self.correct(q), str(self.d.by_id("authorities")[self.key(q)]["election_term_years"]))

    def test_ethics_and_authorities(self):
        # the ethics an authority excludes are named in its conditions (gestalt-only ones aside)
        gestalt = {"auth_hive_mind", "auth_machine_intelligence"}
        for q in self.questions("ethic_authority", 5):
            ethic = q["id"].split(".")[2]

            def usable(answer):
                a = self.auth(answer)
                if a["id"] in gestalt or ethic == "ethic_gestalt_consciousness":
                    return a["id"] in gestalt and ethic == "ethic_gestalt_consciousness"
                return not mentions(a, ethic)
            self.assert_one_true(q, usable)
        for q in self.questions("authority_ethic", 5):
            a = self.d.by_id("authorities")[self.key(q)]
            self.assert_one_true(q, lambda x: mentions(a, self.ids("ethics")[x]))

    def test_ethics_and_picks(self):
        for template, set_name in (("ethic_civic_forbidden", "civics"), ("ethic_origin_forbidden", "origins")):
            for q in self.questions(template, 5):
                ethic = q["id"].split(".")[2]
                item = self.d.by_id(set_name)[self.ids(set_name)[self.correct(q)]]
                self.assertEqual(item["id"], self.key(q))
                self.assertIn(ethic, rl.read(item).ban["ethics"])
                for other in self.wrong(q):
                    self.assertNotIn(ethic, rl.read(self.d.by_id(set_name)[self.ids(set_name)[other]]).ban["ethics"])

    def test_ethic_authority_civic(self):
        empires = rl.Empires(self.d)
        for q in self.questions("ethic_authority_civic", 5):
            en = q["text"]["en"]
            auth = [i for n, i in self.ids("authorities").items() if f"With the {n} authority" in en]
            ethic = [i for n, i in self.ids("ethics").items() if f"and the ethic {n}," in en]
            self.assertEqual((len(auth), len(ethic)), (1, 1), en)

            def fits(answer):
                i = self.ids("civics")[answer]
                return empires.satisfiable([(i, "civics", rl.read(self.d.by_id("civics")[i]))], authority=auth[0], ethic=ethic[0])
            self.assert_one_true(q, fits)

    def test_variants(self):
        swaps = {}
        for a in self.d.items("authorities"):
            for s in a["swaps"]:
                names = self.d.name("authorities", s["id"])
                if names:
                    swaps[names["en"]] = a["id"]
        for q in self.questions("authority_variant_base", 10):
            self.assertEqual(self.ids("authorities")[self.correct(q)], self.key(q))
        for q in self.questions("authority_variant", 10):
            self.assert_one_true(q, lambda a: swaps[a] == self.key(q))
        for q in self.questions("authority_not_playable"):
            self.assert_one_true(q, lambda a: self.auth(a)["id"] not in rl.PLAYER_AUTHORITIES)


if __name__ == "__main__":
    unittest.main()
