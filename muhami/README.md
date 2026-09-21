# MUHAMI

Voice-first multilingual Kuwaiti legal assistant. Independent UI; legal data remains behind the secure Sabeq backend.

## Languages
Arabic, English, Urdu, Hindi, Bengali, Filipino, Persian.

## Architecture
Client -> secure legal assistant API -> analysis/orchestration -> Sabeq legal corpus -> verified official sources -> grounded response -> voice/text.

## Security
Do not place API keys, case files, private legal documents, or production database credentials in GitHub Pages. The client calls a backend endpoint only.

## Integration contract
POST /api/legal-assistant
{ message, language, source: "muhami" }

The backend should return an answer plus citations/source metadata. It should use the existing Sabeq legal corpus and official-source synchronization rather than duplicate the legal database.
