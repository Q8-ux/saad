---
name: android-apk-audit
description: "مسار فحص وتعديل تطبيقات أندرويد. Inspect APK structure, check local Android analysis tools, and guide authorized decompilation, scoped edits, repacking, signing and device verification. Use for APK analysis, apk-reverse, مسار APK, مسار الأندرويد, DEX or smali inspection, ad SDK removal from owned apps, and Android release audits. Do not use for building a new Android app from a website or for iOS."
---

# مسار فحص وتعديل تطبيقات أندرويد

Use the original sources in [references/sources.md](references/sources.md).
Treat this as an independently implemented workflow, not an installed copy of
`newliver666/apk-reverse`. Its documentation was found, but fetching its source
failed during setup. Do not present upstream features as locally tested capabilities.

## Start with evidence

1. Identify the artifact and requested change. Treat an APK, split APK set, App
   Bundle, source project, and WebView wrapper as different inputs.
2. Reuse authorization already established by the user. Limit modification to
   owned apps or authorized targets; ask for missing scope only when necessary.
3. Prefer changes in the original source project when available. Determine
   whether the relevant behavior belongs to client code, web content, or a server.
4. Run the bundled environment check:

   ```bash
   python3 scripts/doctor.py
   ```

   Paths are relative to this skill. Pass `--tool-dir PATH` for tools outside
   PATH. A found path is not a tested executable or connected device.
5. For an APK, run the bundled non-extracting inventory:

   ```bash
   python3 scripts/inspect_apk.py /absolute/path/app.apk
   ```

   This computes SHA-256 and inventories archive entries, DEX headers, native
   architectures, and framework hints. It does not decode binary XML, verify APK
   signatures, recover original source, identify all SDKs, or certify security.
   Stop on unsafe archive metadata before invoking extractors.

## Choose a tool for the question

| Need | First choice | Alternative / boundary |
| --- | --- | --- |
| Manifest and focused cross-DEX queries | Droid ASC | JADX or Androguard |
| Read decompiled Java | JADX | ddc; compare difficult methods to bytecode |
| Decode resources and rebuild | Apktool | Prefer the original build project |
| Inspect or edit bytecode | Google smali/baksmali | Target one proven method at a time |
| Align, sign and verify | Android SDK zipalign/apksigner | uber-apk-signer with an explicitly selected key |
| Observe runtime behavior | ADB + Frida | Requires a suitable test device or emulator |
| Broader security review | MobSF + OWASP MASTG | Optional; separate installation and scope |

Read [references/workflow.md](references/workflow.md) before decoding, modifying,
repacking, signing, installing, or conducting runtime analysis. Select only the
tools the task needs; referencing a repository does not install its software.

## Preserve artifacts and verify the result

- Work on copies; retain the input hash, version, package identity and signing
  certificate evidence. Keep app files, keystores, credentials, traffic and reports
  out of public Git repositories. Label synthetic fixture tests clearly.
- Rebuild an unchanged control before a binary patch. Record failed stages and
  commands; change approach after two failures of the same kind.
- Do not turn a local UI edit into a claim about server authorization. Do not
  fabricate sessions or claim that decompilation restores a complete source tree.
- Keep signing credentials outside command-line arguments and committed files.
  Never replace a production key with a debug key. Treat uninstalling an app as a
  separate data-losing action; never use it as an automatic installation retry.
- Report structural inventory, code analysis, build, signature verification,
  installation and runtime behavior as separate states. A successful build or
  launch does not establish working login, payment, microphone, networking,
  updates or Arabic rendering.
- Deliver an Arabic report with evidence, changed files, test results, remaining
  blockers and the next practical action. Mark unperformed checks explicitly.

Invoke naturally with: «طبّق مسار فحص وتعديل تطبيقات أندرويد على هذا التطبيق».
