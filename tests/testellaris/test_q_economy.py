"""Economy questions (T4106): the condition readers and each answer against the data."""
import unittest

from bank_case import BankCase
import q_economy as qe

STRATA_KEY = {"ruler": "rulers", "specialist": "specialists", "worker": "workers"}


class ReaderTest(unittest.TestCase):
    def test_resources_include_conditions(self):
        job = {"produces": {"energy": 6}, "resources": {"produces": [{"energy": 6}, {"trigger": "x = yes", "alloys": 1, "mult": 2}]}}
        self.assertEqual(qe.resources_of(job, "produces"), {"energy", "alloys"})

    def test_jobs_of_modifiers(self):
        item = {"jobs": {}, "planet_modifier": {"job_miner_add": 100},
                "triggered_planet_modifier": [{"modifier": {"job_criminal_add": 1, "planet_amenities_add": 2}}]}
        self.assertEqual(qe.jobs_of_modifiers(item), ["miner", "criminal"])

    def test_owner_values_only_plain_lines(self):
        text = "from = {\n\thas_valid_civic = civic_a\n\tOR = {\n\t\thas_origin = origin_b\n\t}\n}"
        self.assertEqual(qe.owner_values(text, "from"), [("has_valid_civic", "civic_a")])


class EconomyFactsTest(BankCase):
    def item(self, set_name, name):
        return self.d.by_id(set_name)[self.ids(set_name)[name]]

    def parts(self, q):
        return q["id"].split(".")[2:]

    def source(self, q, set_name):
        return self.d.by_id(set_name)[self.parts(q)[0]]

    def test_strata(self):
        labels = self.d.loc["en"]["jobs"]
        for q in self.questions("job_stratum", 10):
            self.assertEqual(self.correct(q), labels[self.source(q, "jobs")["category"]])

    def test_same_resource(self):
        for template, field in (("job_same_output", "produces"), ("job_same_upkeep", "upkeep")):
            for q in self.questions(template, 10):
                wanted = qe.resources_of(self.source(q, "jobs"), field)
                self.assertEqual(len(wanted), 1, q["id"])
                self.assert_one_true(q, lambda a: wanted <= qe.resources_of(self.item("jobs", a), field))

    def test_most_output(self):
        for q in self.questions("job_most_output", 10):
            made = [self.item("jobs", a)["produces"] for a in q["answers"]["en"]]
            self.assertEqual(len({k for m in made for k in m}), 1, q["id"])
            values = [next(iter(m.values())) for m in made]
            best = values[q["correct"]]
            self.assertEqual([v for v in values if v >= best], [best], q["id"])

    def test_branch_offices(self):
        for q in self.questions("branch_office", 10):
            self.assert_one_true(q, lambda a: self.item("buildings", a)["owner_type"] == "corporate")
        for q in self.questions("branch_office_criminal", 5):
            self.assert_one_true(q, lambda a: "is_illegal_criminal = yes" in self.item("buildings", a)["potential"])
        for q in self.questions("branch_office_job", 10):
            given = {self.d.loc["en"]["jobs"].get(j) for j in qe.jobs_of_modifiers(self.source(q, "buildings"))}
            self.assert_one_true(q, lambda a: a in given)
        for q in self.questions("branch_office_requirement", 3):
            potential = self.source(q, "buildings")["potential"]
            self.assert_one_true(q, lambda a: any(self.ids(s).get(a, "\0") in potential for s in ("civics", "origins")))

    def test_build_times(self):
        for q in self.questions("building_slowest", 10):
            days = [self.item("buildings", a)["base_buildtime"] for a in q["answers"]["en"]]
            self.assertEqual([d for d in days if d >= days[q["correct"]]], [days[q["correct"]]], q["id"])
        for q in self.questions("building_days", 10):
            self.assertEqual(self.correct(q), str(self.source(q, "buildings")["base_buildtime"]))

    def test_basic_numbers(self):
        for template, set_name, field, at_least in (
                ("job_base_output", "jobs", "produces", 10), ("job_base_upkeep", "jobs", "upkeep", 6),
                ("building_base_cost", "buildings", "cost", 4), ("building_base_upkeep", "buildings", "upkeep", 3)):
            for q in self.questions(template, at_least):
                item = self.source(q, set_name)
                self.assertEqual((q["tier"], q["category"], q["dlc"]), (1, "engineering", []), q["id"])
                self.assertEqual(len(item[field]), 1, q["id"])
                self.assertEqual(float(self.correct(q)), next(iter(item[field].values())), q["id"])
                self.assert_named(q, set_name, item["id"])

    def test_living_standards(self):
        def power(a, stratum):
            return self.item("living_standards", a)["political_power"][stratum]

        def upkeep(a, stratum):
            return sum(self.item("living_standards", a)["pop_upkeep"][STRATA_KEY[stratum]].values())

        for template, value in (("living_power_most", power), ("living_upkeep_most", upkeep)):
            for q in self.questions(template, 8):
                stratum = self.parts(q)[1]
                values = [value(a, stratum) for a in q["answers"]["en"]]
                self.assertEqual([v for v in values if v >= values[q["correct"]]], [values[q["correct"]]], q["id"])
        for q in self.questions("living_power", 8):
            stratum = self.parts(q)[1]
            self.assertEqual(float(self.correct(q)), self.source(q, "living_standards")["political_power"][stratum])
        for q in self.questions("living_civic", 1):
            potential = self.source(q, "living_standards")["potential"]
            self.assert_one_true(q, lambda a: self.item("living_standards", a)["potential"] == potential)


if __name__ == "__main__":
    unittest.main()
