"""Testellaris question bank (sections 40-41): runs the unit tests of tests/testellaris/ (validator, bank, generator)."""
import os, unittest
from smoke.common import check, ROOT


class _Result(unittest.TestResult):
    """Reports every test as a smoke check; a skipped test is reported as passed with its reason."""

    def addSuccess(self, test):
        check("testellaris: " + test.id().split(".", 1)[1], True)

    def addFailure(self, test, err):
        check("testellaris: " + test.id().split(".", 1)[1], False, self._exc_info_to_string(err, test).strip().splitlines()[-1])

    addError = addFailure

    def addSubTest(self, test, subtest, err):
        if err is not None:  # a failed subTest never reaches addFailure
            self.addFailure(subtest, err)

    def addSkip(self, test, reason):
        check("testellaris: " + test.id().split(".", 1)[1] + " (skipped: " + reason + ")", True)


async def run(t):
    folder = os.path.join(ROOT, "tests", "testellaris")
    suite = unittest.defaultTestLoader.discover(folder, top_level_dir=folder)
    result = _Result()
    suite.run(result)
    check("testellaris: the unit tests of tests/testellaris/ ran", result.testsRun > 0, result.testsRun)
