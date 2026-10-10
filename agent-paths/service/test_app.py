import unittest
from app import route

class RouteTests(unittest.TestCase):
    def test_allowed(self):
        status, result = route("sabeq-legal", "M01")
        self.assertEqual(status, 200)
        self.assertEqual(result["status"], "configured_not_executed")

    def test_disallowed(self):
        self.assertEqual(route("noura-alattal", "M08")[0], 403)

    def test_unknown_project(self):
        self.assertEqual(route("missing-project", "M01")[0], 404)

    def test_unknown_module(self):
        self.assertEqual(route("sabeq-legal", "M99")[0], 403)

if __name__ == "__main__":
    unittest.main()
