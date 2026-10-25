# Data Model

## Runtime credential configuration
MANAGEMENT_PASSWORD_USERS: JSON {version:1,accounts:[{username,salt,hash,enabled}]}.
username: unique, normalized lowercase, pattern [a-z][a-z0-9_]{2,31}.
salt: 32 lowercase hexadecimal characters (16 bytes).
hash: 64 lowercase hexadecimal characters (32 bytes).
enabled: boolean. Initial list contains exactly user1/user2/user3/user5/it_user.
MANAGEMENT_PASSWORD_PEPPER: secret random text, minimum 32 characters.
All values are server-only; no real values occur in source or examples.

## Existing management_sessions
token_hash only; internal email field holds staff:username:credentialTag; name is username. Fixed role operator. expiry 8h, idle 1h. Public manager identity uses stable staff:username, username and role; no tag or hashes returned. Legacy administrative email sessions remain unchanged.

## Existing api_rate_limits
Hourly global password-login bucket (30) and per-source/account bucket (8). User agent is normalized for these buckets. No password or plaintext credential records.
