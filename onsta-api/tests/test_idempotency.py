import unittest
import asyncio
from app.core.idempotency import IdempotencyManager

class TestIdempotency(unittest.IsolatedAsyncioTestCase):
    async def test_first_call_acquires_lock(self):
        mgr = IdempotencyManager()
        is_new, cached = await mgr.lock_or_retrieve("key-123")
        self.assertTrue(is_new)
        self.assertIsNone(cached)

    async def test_concurrent_call_detects_in_progress(self):
        mgr = IdempotencyManager()
        await mgr.lock_or_retrieve("key-456")
        
        # Second call while in progress
        is_new, cached = await mgr.lock_or_retrieve("key-456")
        self.assertFalse(is_new)
        self.assertIsNone(cached) # None means currently IN_PROGRESS

    async def test_completed_call_returns_cached_response(self):
        mgr = IdempotencyManager()
        await mgr.lock_or_retrieve("key-789")
        
        expected_response = {"clinic_id": "c1", "status": "APPROVED", "fields": 25}
        await mgr.mark_completed("key-789", expected_response)

        # Retry after completion
        is_new, cached = await mgr.lock_or_retrieve("key-789")
        self.assertFalse(is_new)
        self.assertEqual(cached, expected_response)

    async def test_released_key_can_be_reacquired(self):
        mgr = IdempotencyManager()
        await mgr.lock_or_retrieve("key-abc")
        await mgr.release("key-abc")
        
        is_new, cached = await mgr.lock_or_retrieve("key-abc")
        self.assertTrue(is_new)
        self.assertIsNone(cached)

if __name__ == "__main__":
    unittest.main()
