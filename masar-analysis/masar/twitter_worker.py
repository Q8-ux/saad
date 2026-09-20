"""Use twitter-cli's read client without its implicit browser-cookie fallback."""
import dataclasses
import json
import os
import re
import sys


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+", sys.argv[1]):
        raise SystemExit(2)
    token, ct0 = os.environ.get("TWITTER_AUTH_TOKEN"), os.environ.get("TWITTER_CT0")
    if not token or not ct0:
        raise SystemExit(2)
    from twitter_cli.client import TwitterClient
    client = TwitterClient(token, ct0, rate_limit_config={"maxRetries": 0, "maxCount": 10})
    tweets = client.fetch_tweet_detail(sys.argv[1], count=10)
    if not tweets:
        raise SystemExit(2)
    print(json.dumps([dataclasses.asdict(t) for t in tweets], ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit(2) from None
