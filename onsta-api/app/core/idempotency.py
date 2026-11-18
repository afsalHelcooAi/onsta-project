import json
from typing import Optional, Dict, Any

class IdempotencyRecord:
    def __init__(self, key: str, status: str, response: Optional[Dict[str, Any]] = None):
        self.key = key
        self.status = status # "IN_PROGRESS" | "COMPLETED"
        self.response = response

class IdempotencyManager:
    """
    In-memory / Redis Idempotency Store to prevent duplicate executions,
    duplicate AI billing, and inconsistent concurrent state changes.
    """
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self._memory_store: Dict[str, IdempotencyRecord] = {}

    async def lock_or_retrieve(self, idempotency_key: str) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Returns (is_new, existing_response):
        - If (True, None): Key locked successfully, caller must execute operation.
        - If (False, response): Key was already processed, caller should return existing_response.
        - If (False, None): Key is currently IN_PROGRESS (caller should return 409 Conflict).
        """
        if not idempotency_key:
            return True, None

        if self.redis:
            val = await self.redis.get(f"idempotency:{idempotency_key}")
            if val:
                data = json.loads(val)
                if data["status"] == "COMPLETED":
                    return False, data.get("response")
                elif data["status"] == "IN_PROGRESS":
                    return False, None
            # Set IN_PROGRESS with TTL
            await self.redis.set(
                f"idempotency:{idempotency_key}",
                json.dumps({"status": "IN_PROGRESS"}),
                ex=300 # 5 min lock
            )
            return True, None
        else:
            rec = self._memory_store.get(idempotency_key)
            if rec:
                if rec.status == "COMPLETED":
                    return False, rec.response
                elif rec.status == "IN_PROGRESS":
                    return False, None
            self._memory_store[idempotency_key] = IdempotencyRecord(
                key=idempotency_key, status="IN_PROGRESS"
            )
            return True, None

    async def mark_completed(self, idempotency_key: str, response: Dict[str, Any], ttl_seconds: int = 86400):
        if not idempotency_key:
            return
        if self.redis:
            await self.redis.set(
                f"idempotency:{idempotency_key}",
                json.dumps({"status": "COMPLETED", "response": response}),
                ex=ttl_seconds
            )
        else:
            self._memory_store[idempotency_key] = IdempotencyRecord(
                key=idempotency_key, status="COMPLETED", response=response
            )

    async def release(self, idempotency_key: str):
        if not idempotency_key:
            return
        if self.redis:
            await self.redis.delete(f"idempotency:{idempotency_key}")
        else:
            self._memory_store.pop(idempotency_key, None)
