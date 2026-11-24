import json
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
import app as video


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_failure_logs_no_submitted_url_or_cookie(self):
        secret = 'test-private-session-cookie'
        stderr = ('Sign in to confirm you are not a bot: https://youtu.be/sample?cookie=' + secret).encode()
        with patch.object(video, 'command', new=AsyncMock(return_value=(1, b'', stderr))):
            with self.assertLogs(video.logger, level='WARNING') as logs:
                with self.assertRaises(HTTPException) as failure:
                    await video.read_info('https://youtu.be/sample')
        self.assertEqual(failure.exception.status_code, 422)
        self.assertIn('provider_requires_verification', logs.output[0])
        self.assertNotIn(secret, str(logs.output))
        self.assertNotIn('youtu.be', str(logs.output))

    async def test_health_reports_runtime_version_without_exposing_credentials(self):
        with patch.object(video, 'APP_PASSWORD', 'test-secret-not-for-health'):
            health = video.health()
        self.assertTrue(health['engine_version'])
        self.assertIsInstance(health['javascript_runtime_ready'], bool)
        self.assertNotIn('test-secret-not-for-health', json.dumps(health))


if __name__ == '__main__':
    unittest.main()
