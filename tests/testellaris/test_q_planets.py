"""Planet and colony questions (T4105): the condition readers and each answer against the data."""
import unittest

from bank_case import BankCase
import q_planets as qp

DISTRICT_MODIFIERS = {"district_generator": "district_generator_max_add", "district_mining": "district_mining_max_add",
                      "district_farming": "district_farming_max_add"}


class ConditionTest(unittest.TestCase):
    def test_ordinary_job_condition(self):
        self.assertTrue(qp.ordinary("exists = owner\nowner = {\n\tis_regular_empire = yes\n\tis_fallen_empire_spiritualist = no\n}"))
        self.assertTrue(qp.ordinary("NOT = {\n\thas_modifier = slave_colony\n}\nowner = {\n\tis_gestalt = yes\n}"))
        self.assertFalse(qp.ordinary("owner = {\n\tis_tankbound_empire = yes\n}"))
        self.assertFalse(qp.ordinary("owner = {\n\tis_fallen_empire_spiritualist = yes\n}"))

    def test_planet_list(self):
        self.assertEqual(qp.planet_list("OR = {\n\tis_planet_class = pc_arid\n\tis_planet_class = pc_desert\n}"), {"pc_arid", "pc_desert"})
        self.assertIsNone(qp.planet_list("OR = {\n\tis_planet_class = pc_arid\n\tis_wet = yes\n}"))
        self.assertIsNone(qp.spawn_classes("modifier = {\n\tadd = 5\n\tis_wet = yes\n}"))


class PlanetFactsTest(BankCase):
    def item(self, set_name, name):
        return self.d.by_id(set_name)[self.ids(set_name)[name]]

    def source(self, q, set_name):
        return self.d.by_id(set_name)[q["id"].split(".")[2]]

    def test_climates(self):
        for q in self.questions("world_climate", 5):
            climate = self.source(q, "planet_classes")["climate"]
            self.assert_one_true(q, lambda a: self.item("planet_classes", a)["climate"] == climate)

    def test_blockers(self):
        for q in self.questions("feature_blocker", 10):
            self.assert_one_true(q, lambda a: self.item("deposits", a)["blocker"])
        for q in self.questions("blocker_time", 10):
            self.assertEqual(self.correct(q), str(self.source(q, "deposits")["time"]))
        for q in self.questions("blocker_districts", 10):
            self.assertEqual(self.correct(q), str(-self.source(q, "deposits")["planet_modifier"]["planet_max_districts_add"]))

    def test_features(self):
        for q in self.questions("feature_district", 10):
            mods = self.source(q, "deposits")["planet_modifier"]
            district = [m for d, m in DISTRICT_MODIFIERS.items() if self.d.loc["en"]["districts"][d] in q["text"]["en"]]
            self.assertEqual(len(district), 1, q["id"])
            self.assert_one_true(q, lambda a: district[0] in (self.item("deposits", a)["planet_modifier"] or {}))
            self.assertIn(district[0], mods)
        for q in self.questions("feature_district_amount", 10):
            mods = self.source(q, "deposits")["planet_modifier"]
            self.assertIn(int(self.correct(q)), [mods.get(m) for m in DISTRICT_MODIFIERS.values()])
        for q in self.questions("feature_world", 10):
            allowed = qp.planet_list(self.source(q, "deposits")["potential"])
            self.assert_one_true(q, lambda a: self.ids("planet_classes")[a] in allowed)
        for q in self.questions("modifier_world", 10):
            world = [i for n, i in self.ids("planet_classes").items() if f"class {n}?" in q["text"]["en"]]
            self.assert_one_true(q, lambda a: world[0] in qp.spawn_classes(self.item("planet_modifiers", a)["spawn_chance"]))

    def test_designations(self):
        def job_of(q):
            return q["id"].split(".")[3]
        for q in self.questions("designation_job", 10):
            key = f"{job_of(q)}_jobs_bonus_workforce_mult"
            self.assert_one_true(q, lambda a: key in (self.item("designations", a)["planet_modifier"] or {}))
        for q in self.questions("designation_bonus", 10):
            mods = self.source(q, "designations")["planet_modifier"]
            values = {round(v * 100) for k, v in mods.items() if k.endswith("_jobs_bonus_workforce_mult")}
            self.assertEqual(values, {int(self.correct(q).strip("+ %"))})
        for q in self.questions("designation_world", 5):
            own = qp.required_district_set(self.source(q, "designations")["potential"])
            self.assert_one_true(q, lambda a: qp.required_district_set(self.item("designations", a)["potential"]) == own)

    def test_jobs(self):
        for template, set_name in (("district_job", "districts"), ("zone_job", "zones"), ("capital_job", "buildings")):
            for q in self.questions(template, 8):
                item = self.source(q, set_name)
                given = {self.d.loc["en"]["jobs"].get(j) for j in qp.item_jobs(item)[1]}
                self.assert_one_true(q, lambda a: a in given)
                self.assert_named(q, set_name, item["id"])

    def test_capitals(self):
        for q in self.questions("capital_job_count", 8):
            _, _, key, job = q["id"].split(".")
            self.assertEqual(self.correct(q), str(self.d.by_id("buildings")[key]["jobs"][job]))
        for q in self.questions("capital_housing", 8):
            self.assertEqual(self.correct(q), str(self.source(q, "buildings")["planet_modifier"]["planet_housing_add"]))


if __name__ == "__main__":
    unittest.main()
