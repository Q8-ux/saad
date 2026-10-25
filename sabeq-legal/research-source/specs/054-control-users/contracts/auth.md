# Management password contract

POST /api/management/password-login, application/json, body <=4096 bytes:
{username:string,password:string}. Username normalized; password retained exactly, length 16–256. Only configured accounts exist; no signup.

200: token, expiresAt, manager {email:stable-principal,name,username,role:'operator',sections:[allowed-sections]}.
401: generic invalid credentials, no token.
429: hourly global/per-account limit exceeded.
503: unavailable/malformed protected configuration; no secrets in response.
Origin checks apply before processing. No credentials in query parameters.

GET /api/management/session: current safe manager including role/sections.
POST /api/management/logout: invalidates current session only.

Operator GET: session/snapshot/memos/inbox/users/updates/commands and legislation read routes.
Operator POST: logout/users/read/inbox/commands.
Other authenticated routes return403 for operators before reading integrations or writing data. Existing identity login/exchange and administrator routes retain current behavior.
