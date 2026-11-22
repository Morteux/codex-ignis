"""Localisation reader on the fixture game folder (T2503)."""
import unittest
from helpers import FIXTURES
from pdx.game import GameFiles
from pdx.localisation import parse_yml, plain


class LocalisationReader(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loc = GameFiles(FIXTURES).localisation

    def test_every_language_folder(self):
        self.assertEqual(self.loc.languages(), ["english", "japanese", "spanish"])
        self.assertEqual(self.loc.get("tech_test", "spanish"), "Tecnología de prueba")
        self.assertEqual(self.loc.get("tech_test", "japanese"), "テスト技術")

    def test_bom_version_and_quotes(self):
        self.assertEqual(self.loc.raw("tech_test"), "Test Technology")  # file starts with a BOM
        self.assertEqual(self.loc.raw("no_version"), "No version number")
        self.assertEqual(self.loc.raw("job_test_desc"), 'A "quoted" word inside the text.')
        self.assertEqual(self.loc.raw("trailing"), "Text")

    def test_later_files_and_replace_folder_override(self):
        self.assertEqual(self.loc.raw("building_test"), "Test Building (later file)")
        self.assertEqual(self.loc.raw("to_replace"), "Replaced")

    def test_references(self):
        self.assertEqual(self.loc.get("tech_test_desc"), "Unlocks the Test Building (later file) and gives £energy£ §Y+5§! Energy.")
        self.assertEqual(self.loc.get("formatted"), "Discount $DISCOUNT|%0$ and Test Building (later file)")
        self.assertEqual(self.loc.get("cycle_a"), "A B $cycle_a$")  # a cycle stops
        self.assertIsNone(self.loc.get("missing_key"))
        self.assertEqual(self.loc.first(["missing_key", "job_test"]), "Tester")

    def test_colour_codes_and_icons(self):
        self.assertEqual(plain(self.loc.get("tech_test_desc")), "Unlocks the Test Building (later file) and gives +5 Energy.")
        self.assertEqual(plain("§HName§! and £minerals|2£ ore"), "Name and ore")

    def test_parse_yml(self):
        self.assertEqual(parse_yml('﻿l_german:\n key:0 "Wert"\n'), ("german", {"key": "Wert"}))


if __name__ == "__main__":
    unittest.main()
