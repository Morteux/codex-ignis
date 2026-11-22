"""Shared paths of the extractor tests: run with `python -m unittest discover -s tests/extract`."""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
FIXTURES = ROOT + "/tests/fixtures/game-files"
sys.path.insert(0, ROOT + "/tools/extract")
