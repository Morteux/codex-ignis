"""Extractors of the Testellaris topics (T4110) on the fixture game folder: species traits, ascension
perks, traditions, ship components, megastructures, crises, fallen empires and events."""
import unittest
from helpers import TempGame, by_id
import extract_ascension_perks, extract_crises, extract_events, extract_fallen_empires
import extract_megastructures, extract_ship_components, extract_species_traits, extract_traditions


class SpeciesTraits(unittest.TestCase):
    def test_fields_and_leader_traits_left_out(self):
        with TempGame(["gfx/interface/icons/traits/trait_test_strong.dds"]) as t:
            ds = extract_species_traits.extract(t.game)
            spanish = t.game.localisation.get("trait_test_strong", "spanish")
        items = by_id(ds)
        self.assertNotIn("leader_trait_test", items)
        s = items["trait_test_strong"]
        self.assertEqual((s["name"], s["cost"], s["category"]), ("Strong", 2, "normal"))
        self.assertEqual((s["opposites"], s["allowed_archetypes"]), (["trait_test_weak"], ["BIOLOGICAL", "LITHOID"]))
        self.assertEqual((s["modifier"], s["dlc"]), ({"pop_bonus_workforce_mult": 0.05}, ["Test DLC"]))
        self.assertEqual(s["icon"]["asset"], "species_traits/trait_test_strong.png")
        self.assertEqual(spanish, "Fuerte")
        w = items["trait_test_weak"]
        self.assertEqual((w["cost"], w["initial"], w["dlc"], w["icon"]), (-1, False, [], None))


class AscensionPerks(unittest.TestCase):
    def test_fields(self):
        with TempGame() as t:
            p = by_id(extract_ascension_perks.extract(t.game))["ap_test_perk"]
        self.assertEqual((p["name"], p["modifier"]), ("Test Perk", {"country_unity_produces_mult": 0.1}))
        self.assertEqual(p["dlc"], ["Second Test DLC"])  # through the has_test_dlc scripted trigger
        self.assertIn("num_ascension_perks > 2", p["possible"])


class Traditions(unittest.TestCase):
    def test_trees_and_traditions(self):
        with TempGame() as t:
            categories, traditions = extract_traditions.extract(t.game)
        c = by_id(categories)["tradition_test"]
        self.assertEqual((c["name"], c["desc"]), ("Testing", "To test is to know."))
        self.assertEqual((c["traditions"], c["adoption_bonus"], c["finish_bonus"]), (["tr_test_one", "tr_test_two"], "tr_test_adopt", "tr_test_finish"))
        self.assertEqual(c["dlc"], ["Test DLC"])
        items = by_id(traditions)
        one = items["tr_test_one"]
        self.assertEqual((one["category"], one["kind"], one["name"]), ("tradition_test", "tradition", "First Test"))
        self.assertEqual(one["swaps"][0]["name"], "tr_test_one_hive")
        self.assertEqual(items["tr_test_two"]["triggered_modifier"][0]["modifier"], {"starbases_upkeep_mult": -0.2})
        self.assertEqual((items["tr_test_adopt"]["kind"], items["tr_test_finish"]["kind"]), ("adopt", "finish"))
        self.assertIn("tr_test_orphan: in no tradition category", categories.warnings)


class ShipComponents(unittest.TestCase):
    def test_templates_and_csv_stats(self):
        with TempGame() as t:
            ds = extract_ship_components.extract(t.game)
        items = by_id(ds)
        self.assertEqual(sorted(items), ["MEDIUM_TEST_LASER", "SMALL_TEST_LASER", "TEST_SHIELD"])
        s = items["SMALL_TEST_LASER"]
        self.assertEqual((s["name"], s["template"], s["size"], s["cost"]), ("Small Test Laser", "weapon", "small", {"alloys": 3}))
        self.assertEqual(s["stats"], {"cost": 10, "power": -5, "min_damage": 6, "max_damage": 16.5})
        self.assertEqual(s["power"], -5)  # the CSV overrides the .txt value, as in the game
        self.assertEqual((s["prerequisites"], s["upgrades_to"]), (["tech_test"], "MEDIUM_TEST_LASER"))
        self.assertEqual(items["MEDIUM_TEST_LASER"]["dlc"], ["Test DLC"])
        self.assertEqual((items["TEST_SHIELD"]["template"], items["TEST_SHIELD"]["modifier"]), ("utility", {"ship_shield_add": 10}))


class Megastructures(unittest.TestCase):
    def test_stages(self):
        with TempGame() as t:
            items = by_id(extract_megastructures.extract(t.game))
        m = items["test_mega_0"]
        self.assertEqual((m["name"], m["desc"], m["build_time"]), ("Test Mega Site", "A test site.", 1800))
        self.assertEqual((m["cost"], m["upkeep"], m["prerequisites"], m["dlc"]), ({"unity": 5000}, {"energy": 5}, ["tech_test"], ["Test DLC"]))
        self.assertEqual((items["test_mega_1"]["upgrade_from"], items["test_mega_1"]["country_modifier"]),
                         (["test_mega_0"], {"country_physics_research_produces_mult": 0.1}))


class Crises(unittest.TestCase):
    def test_paths_levels_perks_objectives(self):
        with TempGame() as t:
            paths, levels, perks, objectives = extract_crises.extract(t.game)
        p = by_id(paths)["test_path"]
        self.assertEqual((p["crisis_currency"], p["levels"], p["objectives"]), ("menace", ["crisis_level_test_1", "crisis_level_test_2"], ["crisobj_test"]))
        lv = by_id(levels)
        self.assertEqual((lv["crisis_level_test_2"]["required_crisis_currency"], lv["crisis_level_test_2"]["order"]), (1000, 1))
        self.assertEqual(lv["crisis_level_test_1"]["perks"], ["menp_test"])
        self.assertEqual(by_id(perks)["menp_test"]["modifier"], {"ship_weapon_damage": 0.1})
        self.assertEqual(by_id(objectives)["crisobj_test"]["name"], "Test Objective")  # the _name key
        self.assertEqual(paths.warnings, [])  # paths have no name of their own


class FallenEmpires(unittest.TestCase):
    def test_country(self):
        with TempGame() as t:
            ds = extract_fallen_empires.extract(t.game)
        items = by_id(ds)
        f = items["fallen_test"]
        self.assertEqual((f["authority"], f["ethics"], f["civics"]), ("auth_imperial", ["ethic_fanatic_test"], ["civic_test_one", "civic_test_two"]))
        self.assertEqual((f["origin"], f["type"], f["species_traits"]), ("origin_fallen_empire", "fallen_empire", ["trait_test_strong"]))
        s = items["fallen_scripted"]
        self.assertEqual((s["ethics"], s["species_traits"], s["dlc"]), ([], ["trait_test_weak"], ["Test DLC"]))
        self.assertIn("fallen_scripted: no ethic in create_country_effect", ds.warnings)


class Events(unittest.TestCase):
    def test_texts(self):
        with TempGame() as t:
            items = by_id(extract_events.extract(t.game))
        self.assertEqual(sorted(items), ["test.1", "test_sub.1"])  # hidden and untitled events left out, subfolders read
        e = items["test.1"]
        self.assertEqual((e["name"], e["desc"], e["scope"], e["namespace"]), ("A Test Event", "Something happens.", "country_event", "test"))
        self.assertEqual((e["desc_keys"], e["option_keys"]), (["test.1.desc", "test.1.desc_b"], ["test.1.a"]))
        self.assertEqual((e["is_triggered_only"], e["dlc"]), (True, ["Test DLC"]))
        self.assertEqual(items["test_sub.1"]["scope"], "carrier_event")


if __name__ == "__main__":
    unittest.main()
