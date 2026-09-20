# Verification — 2026-09-20

- `npm test`: 7/7 passing. Arabic/Urdu timestamps, strict project imports, subtitle offsets, crop geometry, duplicate review, gateway authentication/origin controls, research request shape and idempotency.
- `npm run check`: both frontend modules pass syntax checking.
- Browser: imported a generated 6-second MP4 with audio; created a 1–3 second clip; saved the project, reloaded and restored it with the original file.
- Browser: changed the restored clip to 9:16, added Arabic/English SRT captions and exported a real WebM. ffprobe identified VP9 720×1280, Opus audio, duration 2.000 seconds. Inspected an extracted frame to confirm burned-in captions and center crop. Reimported that WebM successfully; the UI showed 00:02 and 720×1280.
- Responsive browser review: Arabic and Urdu RTL, English LTR. At 375 CSS pixels of content width, document width equals scroll width; no horizontal overflow. Narrow layout was reviewed inside a 390-pixel iframe, not on physical mobile hardware.
- Preview WebMCP was unavailable in the HTTP browser context. Optional tools are registered only when `document.modelContext` exists; ordinary editing does not depend on it.
- Remote AI processing, Buzz delivery and paid provider generation were not live-tested: no production service URLs/keys were provisioned for this workspace. Gateway contracts were verified against source and tested with a local mock service. Service cards accurately require connection.
- GitHub Pages delivery is verified from the deployment run and live page after the source commit; the delivery message includes the live URL only after that check.

Test media and temporary responsive fixtures are excluded from source and deployment.
