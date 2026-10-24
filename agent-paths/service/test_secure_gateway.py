import unittest
from secure_gateway import authorize, allowed, rate_limit, requests

class SecurityTests(unittest.TestCase):
    def setUp(self):
        requests.clear()
        self.keys = {"sabeq-legal": "a" * 40, "manhaj": "b" * 40}

    def test_isolated_credentials(self):
        self.assertTrue(authorize("Bearer " + "a"*40, "sabeq-legal", self.keys))
        self.assertFalse(authorize("Bearer " + "a"*40, "manhaj", self.keys))

    def test_unknown_project(self):
        self.assertFalse(authorize("Bearer " + "a"*40, "missing", self.keys))

    def test_module_allowlist(self):
        self.assertEqual(allowed("manhaj", "M07")[0], 403)
        self.assertEqual(allowed("manhaj", "M03")[0], 200)

    def test_rate_limit(self):
        self.assertTrue(all(rate_limit("manhaj", now=100) for _ in range(30)))
        self.assertFalse(rate_limit("manhaj", now=100))
        self.assertTrue(rate_limit("manhaj", now=161))

if __name__ == "__main__":
    unittest.main()
