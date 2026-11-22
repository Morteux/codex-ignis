"""Game files extractor (section 25): runs the unit tests of tests/extract/ on the fixture game folder."""
import os, unittest
from smoke.common import check, ROOT


class _Result(unittest.TestResult):
    """Reports every test as a smoke check."""

    def addSuccess(self, test):
        check("extractor: " + test.id().split(".", 1)[1], True)

    def addFailure(self, test, err):
        check("extractor: " + test.id().split(".", 1)[1], False, self._exc_info_to_string(err, test).strip().splitlines()[-1])

    addError = addFailure


async def run(t):
    folder = os.path.join(ROOT, "tests", "extract")
    suite = unittest.defaultTestLoader.discover(folder, top_level_dir=folder)
    result = _Result()
    suite.run(result)
    check("extractor: the unit tests of tests/extract/ ran", result.testsRun > 0, result.testsRun)
