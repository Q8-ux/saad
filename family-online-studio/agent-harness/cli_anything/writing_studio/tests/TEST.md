# Test plan

Write tests against synthetic manuscripts only. Do not retrieve or publish the
author's saved manuscripts, credentials or private illustrations.

- `test_core.py`: local input bounds, safe atomic writes, explicit overwrite,
  remote URL validation, required credentials and redirect rejection.
- `test_full_e2e.py`: installed command discovery, JSON inspection, real native
  PDF/DOCX exports, episode separation, books, preservation of source text/order,
  exclusion of private notes, missing assets/invalid scopes, and no-clobber.
- `scripts/check-studio-delivery.mjs`: shared website backend, source immutability,
  cancellation, input validation, safe filenames, archive hashes and batch scope.

Validate PDFs with a PDF parser and DOCX with ZIP/XML parsing; compare source
dialogue and transition text, manifests and SHA-256 digests. Exercise the installed
command from an unrelated directory with CLI_ANYTHING_FORCE_INSTALLED=1.

Browser checks use the actual delivery component with synthetic work data. A
successful browser check does not imply access to a live author's account.

## Results

Verified on 2026-11-22 with the installed wheel, from outside the application checkout.

```text
============================= test session starts ==============================
platform linux -- Python 3.12.14, pytest-9.2.0, pluggy-1.7.0 -- python
cachedir: .pytest_cache
rootdir: family-online-studio/agent-harness
configfile: pyproject.toml
plugins: anyio-4.14.2
collecting ... collected 25 items

studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_native_and_backup_envelopes PASSED [  4%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_input_size_limit PASSED [  8%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_atomic_no_clobber_and_private_permissions PASSED [ 12%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_symbolic_link_is_not_replaced PASSED [ 16%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_requires_https_origin[http://example.com] PASSED [ 20%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_requires_https_origin[https://user:pass@example.com] PASSED [ 24%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_requires_https_origin[https://example.com/api] PASSED [ 28%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_requires_https_origin[https://example.com?token=x] PASSED [ 32%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_requires_https_origin[https://example.com#fragment] PASSED [ 36%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_gateway_and_explicit_work_require_session PASSED [ 40%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_authorization_never_follows_redirect PASSED [ 44%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_core.py::test_remote_failure_does_not_echo_token PASSED [ 48%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_installed_help PASSED [ 52%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_inspect_uses_real_validator PASSED [ 56%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_episode_package_real_pdf_docx PASSED [ 60%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_scene_scope_and_no_clobber PASSED [ 64%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_invalid_scope_cannot_create_output[scene:absent] PASSED [ 68%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_invalid_scope_cannot_create_output[unit:absent] PASSED [ 72%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_invalid_scope_cannot_create_output[part:absent] PASSED [ 76%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_invalid_scope_cannot_create_output[unknown] PASSED [ 80%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_no_missing_or_duplicate_scenes PASSED [ 84%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_play_keeps_continuous_stage_format PASSED [ 88%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_book_a5_and_private_notes[ar] PASSED [ 92%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_book_a5_and_private_notes[en] PASSED [ 96%]
studio-github/family-online-studio/agent-harness/cli_anything/writing_studio/tests/test_full_e2e.py::TestCLISubprocess::test_illustrations_are_never_silently_dropped PASSED [100%]

=============================== warnings summary ===============================
../../../opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/anyio/pytest_plugin.py:14
  /opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/anyio/pytest_plugin.py:14: PytestRemovedIn10Warning: _pytest.python.CallSpec2 has been renamed to CallSpec.
  The CallSpec2 alias will be removed in pytest 10.
  Update imports to use CallSpec instead.
  See https://docs.pytest.org/en/stable/deprecations.html#callspec2-renamed
    from _pytest.python import CallSpec2

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================== 25 passed, 1 warning in 4.81s =========================
```

Shared Node checks also passed: exact scope, complete episode coverage, source immutability, Arabic title normalization, cancellation and real book exports. TypeScript checking and the Worker build passed. The real delivery component was exercised in the browser with synthetic data: per-episode package preparation and stale-result invalidation after an edit. Live author account and real-device Android download were not tested.

