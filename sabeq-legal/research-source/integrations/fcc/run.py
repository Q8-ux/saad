"""Render entry point. The upstream Admin and code-execution routes stay closed."""

import os
import uvicorn

if __name__ == "__main__":
    uvicorn.run("gateway:create_app", factory=True, host="0.0.0.0",
                port=int(os.environ.get("PORT", "10000")),
                proxy_headers=False, access_log=False, log_level="warning")
