---
paths:
  - "src/auth/**"
---

## Two separate auth guards, not one

`JwtAuthGuard` ([jwt-auth.guard.ts](../../src/auth/jwt-auth.guard.ts))
verifies an SSO-issued JWT from a cookie against a JWKS resolved via OIDC
discovery (`SSO_ISSUER` + `.well-known/openid-configuration`), protecting
`POST /ai/generate`. `AiaPlusAuthGuard` verifies a *different* token from a
*different* cookie against a static RSA public key
(`AIA_PLUS_PUBLIC_KEY_PEM`, no discovery) for the AIA+ integration — these
are two unrelated identity sources with their own cookie names and
`request.user`/`request.aiaPlusUser` fields; don't conflate or reuse one
guard for the other's route. Both log at each verification step
(`PinoLogger` `.debug`/`.warn`) since a bad token otherwise just looks like a
generic 401.
