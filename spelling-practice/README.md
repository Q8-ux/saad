# دفتر الإملاء

Finger and stylus handwriting practice for the six visibly checked words in the supplied photograph, in order: **hot, sit, ant, go, bag, cry**, plus **garden**, explicitly added by the user. Garden is appended as page seven so the original page order and saved work stay stable. The handwritten number beside `down` is not a checkmark, so `down` is excluded.

Each word has its own page, with two original center-line dotted tracing rows and one blank row. Recall mode hides the model and keeps separate ink. Pointer capture, touch handling, pen pressure, optional stylus-only input, erasing, undo, reversible page clearing and browser-local autosave are included. Completed status is a manual indicator, not handwriting recognition or a spelling grade. No login, analytics, remote AI calls, or personal details are required.

Each word has a bundled English MP3, played directly on the student's tap with native HTML audio. Playback does not require browser speech synthesis or an installed text-to-speech voice. The native audio controls appear as a fallback if scripted playback is blocked. All seven word pages can be printed on A4 (one word per sheet); the print view contains clean worksheets, not the student's ink. Drawings belong to the current browser and can be removed by clearing its local data.

## Publication

GitHub Pages: https://q8-ux.github.io/saad/spelling-practice/

`Publish Spelling Practice` deploys the static files and seven audio clips over the latest successful Pages artifact, with byte comparisons that preserve other projects. It also runs after successful combined-site deployments to restore this workbook. The workflow is stored in `.github/workflows/deploy-spelling-practice.yml`; the local copy under `deployment/` documents it.

## Validation

```sh
node --check spelling-practice/core.js
node --check spelling-practice/app.js
node --test spelling-practice/tests/*.test.cjs
mkdir -p spelling-practice/dist
cp spelling-practice/index.html spelling-practice/style.css spelling-practice/core.js spelling-practice/app.js spelling-practice/dist/
cp -R spelling-practice/audio spelling-practice/dist/
python spelling-practice/tests/test_publication.py
```

Runtime has no third-party dependencies or network-loaded fonts. UI, pointer and native-audio behavior are covered with a simulated DOM, canvas and audio element; real-device touch/stylus, speakers and browser print pagination should also be checked on the student's device.

Audio clips were synthesized locally with CMU Flite's English `slt` voice, slowed to 85% tempo with FFmpeg without changing pitch. They are generated media included in this repository, rather than calls to an external speech service.
