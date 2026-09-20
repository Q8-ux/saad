"""Read through rdt-cli's client using only an explicitly selected credential file.

Do not use upstream get_credential(): it can scan local browser cookies implicitly.
"""
import json
import os
import re
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"[A-Za-z0-9]+", sys.argv[1]):
        raise SystemExit(2)
    path = Path(os.environ["MASAR_REDDIT_CREDENTIAL_FILE"])
    if path.stat().st_size > 64000:
        raise SystemExit(2)
    payload = json.loads(path.read_text())
    if not isinstance(payload.get("cookies"), dict) or not payload["cookies"].get("reddit_session"):
        raise SystemExit(2)
    from rdt_cli.auth import Credential
    from rdt_cli.client import RedditClient
    credential = Credential(cookies=payload["cookies"], source="explicit-project-file")
    with RedditClient(credential=credential, timeout=12, max_retries=0) as client:
        result = client.get_post_comments(sys.argv[1], limit=10)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Raw transport exceptions can include headers: never print them.
        raise SystemExit(2) from None
