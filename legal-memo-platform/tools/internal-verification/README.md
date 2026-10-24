# Internal Sabeq release verification

Uses the original offline OMH 4.0.2 goal ledger pinned in requirements.txt. This integration runs fixed Sabeq test suites, then records metadata receipts and asks the original completion gate to verify all criteria. It never starts Hermes, calls an LLM, changes model aliases, sends case data, or adds visible website controls.

Install in a Python 3.11+ build environment:

```sh
python -m pip install -r tools/internal-verification/requirements.txt
python -m unittest discover -s tools/internal-verification -p 'test_*.py' -v
python tools/internal-verification/verify.py --profile backend
```

Use profile publication from the shared repository root. The private Cloudflare source uses profile site before its build. Reports and OMH ledgers live under ignored .verification/; stdout/stderr from tests are hashed in memory and never persisted. Missing packages, wrong origins, failed/empty/skipped/todo/cancelled checks, timeouts and a changed source fingerprint block the check. Every invocation creates a new goal and overwrites the latest status before checks start.

Evidence is limited to those test suites. It does not establish current legal authority, a successful production model call, autonomous agent execution, deployment, or a measured performance gain. No Hermes setup is needed for this supported offline core API.
