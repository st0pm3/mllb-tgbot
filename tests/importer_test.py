"""Offline importer failure and cache tests; no provider requests."""
import importlib.util
import json
import pathlib
import tempfile
import types
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('importer', pathlib.Path(__file__).parents[1] / 'scripts/fetch-data.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        module.OUT = pathlib.Path(self.temp.name)
        module.args = types.SimpleNamespace(refresh=False)
        module.STOP.clear()
        module.REPORT['resources'] = {}

    def test_invalid_cache_is_reported_without_network(self):
        (module.OUT / 'catalog.json').write_text('{broken')
        with patch.object(module.urllib.request, 'urlopen') as request:
            self.assertIsNone(module.fetch('/unused', 'catalog'))
            request.assert_not_called()
        self.assertEqual(module.REPORT['resources']['catalog']['status'], 'invalid_cache')

    def test_rate_limit_preserves_cache_and_stops_following_requests(self):
        target = module.OUT / 'catalog.json'
        original = json.dumps({'data': {'records': []}})
        target.write_text(original)
        module.args.refresh = True
        with patch.object(module.time, 'sleep'), patch.object(module.urllib.request, 'urlopen', side_effect=urllib.error.HTTPError('https://example.invalid', 429, 'Slow down', {}, None)) as request:
            self.assertIsNone(module.fetch('/unused', 'catalog'))
            self.assertIsNone(module.fetch('/unused', 'heroes'))
            self.assertEqual(request.call_count, 1)
        self.assertEqual(target.read_text(), original)
        self.assertEqual(module.REPORT['resources']['heroes']['status'], 'not_attempted')

    def test_incomplete_catalog_rejected_but_intentionally_limited_guides_allowed(self):
        page = {'data': {'records': [{}], 'total': 10}}
        with self.assertRaisesRegex(ValueError, 'Incomplete page'):
            module.validate_envelope(page)
        self.assertEqual(module.validate_envelope(page, complete=False), page)

if __name__ == '__main__':
    unittest.main()
