# Validation — control users

41 management tests passed, including all25 combinations for five distinct synthetic accounts, session isolation/logout/expiry/revocation, operator route denials, source/account throttling across changed User-Agent, oversized body rejection, preservation of existing administrative sign-in and actual client-submit handling against the backend routes.

Preview sign-in form inspected at320/390/1440px: password masking and correct labels, no horizontal overflow. No real credentials entered through browser automation.

Five distinct24-character random passwords and16-byte independent salts were generated privately. Real credentials and the pepper are outside both repositories. Source secret scan passed. Runtime activation and live publication pending.

No physical-device test or two-factor enrollment is claimed.

198 mandatory release checks passed (sources33/memo99/access66); both builds and103-file client secret scan passed. Native v146 sourceb073f7581694eae27087513a7c5b3732b78f202a deployed successfully with environment revision15. Five protected accounts configured. The actual private credentials also passed the production verifier locally, including session-principal verification.

Live scripted login was blocked403 by hosting browser-signature protection before the request reached the application. No fingerprint or network bypass was attempted. No successful live login is claimed. Public sign-in form verification follows Pages publication.

tsc --noEmit is not green:21 diagnostics, including the pre-existing missing cloudflare:workers declarations also encountered by the new module. Runtime builds and198 checks pass.
