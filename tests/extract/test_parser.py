"""Paradox script parser on hand-written samples (T2502)."""
import unittest
from helpers import FIXTURES
from pdx.game import GameFiles
from pdx.parser import Block, Color, ParseError, Quoted, parse, to_text


class ParserBasics(unittest.TestCase):
    def test_key_value_and_nested_blocks(self):
        b = parse("a = 1 b = { c = d e = { f = 2.5 } }")
        self.assertEqual(b.get("a"), 1)
        self.assertEqual(b.get("b").get("c"), "d")
        self.assertEqual(b.get("b").get("e").get("f"), 2.5)

    def test_comparison_operators(self):
        b = parse("x >= 10 y < 5 z > 1 w <= 3 v != 2 u == 4 t ?= yes")
        self.assertEqual([op for _, op, _ in b], [">=", "<", ">", "<=", "!=", "==", "?="])
        self.assertEqual(b.get_op("x"), (">=", 10))
        self.assertEqual(b.to_python()["y"], {"op": "<", "value": 5})

    def test_lists_and_quoted_strings(self):
        b = parse('category = { computing "voidcraft" } name = "A # B" n = "10"')
        self.assertEqual(b.get("category").values, ["computing", "voidcraft"])
        self.assertEqual(b.get("name"), "A # B")
        self.assertIsInstance(b.get("n"), Quoted)
        self.assertEqual(b.get("n"), "10")

    def test_comments(self):
        b = parse("# whole line\na = 1 # end of line\n#b = 2\nc = 3")
        self.assertEqual(b.keys(), ["a", "c"])

    def test_repeated_keys(self):
        b = parse("modifier = { factor = 2 } modifier = { factor = 0.5 } single = 1")
        self.assertEqual([m.get("factor") for m in b.get_all("modifier")], [2, 0.5])
        self.assertEqual(b.to_python(), {"modifier": [{"factor": 2}, {"factor": 0.5}], "single": 1})

    def test_yes_no_and_numbers(self):
        b = parse("a = yes b = no c = -3 d = 0.25 e = 2200.01.01 f = 1.0")
        self.assertIs(b.get("a"), True)
        self.assertIs(b.get("b"), False)
        self.assertEqual(b.get("c"), -3)
        self.assertEqual(b.get("d"), 0.25)
        self.assertEqual(b.get("e"), "2200.01.01")
        self.assertEqual(b.get("f"), 1.0)

    def test_colours(self):
        b = parse("color = rgb { 255 128 0 } map = hsv { 0.5 0.25 1.0 } plain = { 1 2 3 }")
        self.assertEqual(b.get("color"), Color("rgb", [255, 128, 0]))
        self.assertEqual(b.get("map").to_python(), {"space": "hsv", "values": [0.5, 0.25, 1.0]})
        self.assertEqual(b.get("plain").values, [1, 2, 3])

    def test_local_variables_and_maths(self):
        warnings = []
        b = parse("@x = 4\n@y = @[ x * 2 + 1 ]\na = @x b = @y c = @[ ( x - 1 ) / 2 ] d = @nope", warnings=warnings)
        self.assertEqual((b.get("a"), b.get("b"), b.get("c")), (4, 9, 1.5))
        self.assertEqual(b.get("d"), "@nope")
        self.assertTrue(any("@nope" in w for w in warnings))
        self.assertEqual(b.variables, {"x": 4, "y": 9})

    def test_global_variables(self):
        self.assertEqual(parse("a = @g b = @[ g * 2 ]", variables={"g": 5}).get("b"), 10)

    def test_bare_blocks_and_scope_keys(self):
        b = parse("l = { { a = 1 } { a = 2 } } scope:target = value:v|P|1|")
        self.assertEqual([x.get("a") for x in b.get("l").values], [1, 2])
        self.assertEqual(b.get("scope:target"), "value:v|P|1|")

    def test_unclosed_block_is_an_error(self):
        with self.assertRaises(ParseError):
            parse("a = { b = 1")

    def test_bom(self):
        self.assertEqual(parse("﻿a = 1").get("a"), 1)

    def test_to_text_round_trip(self):
        b = parse("potential = { num_pops >= 10 NOT = { has_flag = x } name = \"A B\" l = { a b } }")
        text = to_text(b.get("potential"))
        self.assertIn("num_pops >= 10", text)
        self.assertIn('name = "A B"', text)
        self.assertEqual(parse(text), b.get("potential"))


class ParserOnGameFolder(unittest.TestCase):
    """Scripted variables and inline scripts read from the fixture game folder."""

    @classmethod
    def setUpClass(cls):
        cls.game = GameFiles(FIXTURES)
        cls.file = cls.game.parse_file(FIXTURES + "/parser/sample.txt")

    def test_ruleset(self):
        self.assertEqual(self.game.ruleset_id, "stellaris-pc-9.8.7")
        self.assertEqual(self.game.version, "Test v9.8.7 (abcd)")

    def test_scripted_variables(self):
        self.assertEqual(self.game.variables["tier1cost1"], 1000)
        self.assertEqual(self.game.variables["derived"], 2000)
        item = self.file.get("sample_item")
        self.assertEqual(item.get("cost"), 250)
        self.assertEqual(item.get("global_cost"), 1000)
        self.assertEqual(item.get("derived"), 2000)
        self.assertEqual(item.get("maths"), 525)
        self.assertEqual(item.get("brackets"), 100)
        self.assertEqual(item.get("potential").get_op("num_pops"), (">=", 10))
        self.assertEqual(item.get("potential").get_op("maybe"), ("?=", True))

    def test_inline_scripts(self):
        item = self.file.get("second_item")
        upkeeps = item.get_all("upkeep")
        self.assertEqual(upkeeps[0].to_python(), {"minerals": 3, "multiplier": 1})
        self.assertEqual(upkeeps[1].to_python(), {"energy": 2, "multiplier": 1})
        self.assertEqual(item.get("alpha"), 1)
        self.assertEqual(item.get("beta").values, [2, 3])
        self.assertEqual(item.get("owner?").get("has_country_flag"), "multi_line")  # multi-line quoted parameter
        self.assertFalse(item.has("inline_script"))
        self.assertTrue(any("@not_defined" in w for w in self.game.warnings))


if __name__ == "__main__":
    unittest.main()
