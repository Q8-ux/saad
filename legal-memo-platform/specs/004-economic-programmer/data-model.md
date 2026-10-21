# Data model

Use existing management_vault row programmer, sealed with existing AES-GCM vault. Configuration fields: mode (fcc/project), HTTPS baseUrl, retained proxy apiKey, optional model (max 200), successful testedAt/testedModel/durationMs. Secret never returned. Successful test metadata updates use compare-and-swap against the sealed starting configuration so an in-flight request cannot restore rotated credentials. No customer data, prompt or output is added to durable storage automatically. Existing management_commands stores a result only on explicit administrator action.
