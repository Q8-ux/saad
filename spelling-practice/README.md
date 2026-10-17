# دفتر الإملاء

Finger and stylus handwriting practice with **59 pages across five subjects**. English, Science and Social contain all 42 entries from the supplied three-column photograph, covering 41 unique words. Arabic adds eight fully marked dictation examples from the school announcement; Numbers adds the English names for 1–10. `water` appears in both Science and Social and shares one saved word page.

English: hot, sit, ant, garden, go, bag, cry, down, left, play, kind, read, sleep, wash.

Science: creeper, climber, buds, energy, grow, plants, air, animals, sunlight, soil, water, flower, leaf, healthy.

Social: apple, orange, carrot, potato, pilot, nurse, chef, Kuwait, parents, children, soap, water, comb, learn.

Arabic: دَرَسَ، صَعَدَ، خَطَرَ، عَطَسَ، شَعَرَ، سَطَعَ، خَدَعَ، زَرَعَ. These are the announcement's examples, not a claim that the assessment is limited to these words.

Numbers: 1 = One, 2 = Two, 3 = Three, 4 = Four, 5 = Five, 6 = Six, 7 = Seven, 8 = Eight, 9 = Nine, 10 = Ten. Each page traces both the digit and the name, following the supplied image.

Subject buttons follow the photographed order, and previous/next stay within that subject. Original word IDs, array indexes, browser storage key, saved ink and completion indicators are preserved. Direct word links select the appropriate subject. `Kuwait` retains its capital K in the title, tracing guide and print page.

Each word has its own page, with two original center-line dotted tracing rows and one blank row. Arabic guides preserve joined letter forms, consonant dots and all three fathas; the Arabic interface hints and headings use right-to-left direction. Recall mode hides the model and keeps separate ink. Pointer capture, touch handling, pen pressure, optional stylus-only input, erasing, undo, reversible page clearing and browser-local autosave are included. Completed status is a manual indicator, not handwriting recognition or a spelling grade. No login, analytics, remote AI calls, or personal details are required at runtime.

Each word has a bundled MP3 in its language, played directly on the student's tap with native HTML audio. Playback does not require browser speech synthesis or an installed text-to-speech voice. The native audio controls appear as a fallback if scripted playback is blocked. Print one word, the selected subject, or all 59 pages on A4 (one practice per sheet); the print view contains clean worksheets, not the student's ink. Drawings belong to the current browser and can be removed by clearing its local data.

## Publication

GitHub Pages: https://q8-ux.github.io/saad/spelling-practice/

`Publish Spelling Practice` deploys the static files and 59 audio clips over the latest successful Pages artifact, with byte comparisons that preserve other projects. The audio manifest is checked against the word data by tests and required files are validated before publication. The workflow also runs after successful combined-site deployments to restore this workbook. It is stored in `.github/workflows/deploy-spelling-practice.yml`; the local copy under `deployment/` documents it.

## Validation

```sh
node --check spelling-practice/core.js
node --check spelling-practice/app.js
node --check spelling-practice/arabic-guides.js
node --test spelling-practice/tests/*.test.cjs
mkdir -p spelling-practice/dist
cp spelling-practice/index.html spelling-practice/style.css spelling-practice/core.js spelling-practice/app.js spelling-practice/arabic-guides.js spelling-practice/avatar-v1.png spelling-practice/dist/
cp -R spelling-practice/audio spelling-practice/dist/
python spelling-practice/tests/test_publication.py
```

Runtime has no third-party dependencies or network-loaded fonts. UI, pointer and native-audio behavior are covered with a simulated DOM, canvas and audio element; real-device touch/stylus, speakers and browser print pagination should also be checked on the student's device.

The circular avatar was generated from the user's supplied portrait and is used in the page header, browser icon and home-screen shortcut. Only the generated icon is included in this repository; the original photograph is not part of the project. The production PNG preserves transparency and is optimized to 256 × 256 pixels.

English clips, including the number names, were synthesized locally with CMU Flite's English `slt` voice, slowed to 85% tempo with FFmpeg without changing pitch. The present-tense verb `read` uses the homophone `reed` as the synthesis input to ensure /riːd/. The eight Arabic clips were generated with HeyGen's Arabic Hiba voice at 80% speed, then segmented using its word timestamps. All audio is bundled; the app makes no calls to speech services.

`arabic-guides.js` contains prepared vector guides and requires no font download at runtime. To rebuild it, run `python spelling-practice/deployment/build-arabic-guides.py --font /path/to/Cairo-Regular.ttf --output spelling-practice/arabic-guides.js` with Pillow (RAQM), NumPy and SciPy available. The generator shapes whole words before preparing dotted center lines and preserves consonant dots. It renders each fatha as a distinct, darker rising stroke matching the supplied reference, and refuses a word if any of its three fathas is missing. The isolated letters beneath the word are also marked with the same fatha.
