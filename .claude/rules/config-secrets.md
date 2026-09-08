---
paths:
  - "src/config/**"
  - "src/azure-key-vault/**"
  - "src/main.ts"
---

## Config is zod-validated and centrally typed

`envSchema` ([env.schema.ts](../../src/config/env.schema.ts)) fails fast at
boot on a missing/malformed var. Never read `process.env` directly outside
that file — go through `AppConfigService`'s grouped getters (`.database`,
`.botFramework`, `.azureOpenAi`, `.sso`, `.aiaPlus`, etc.).

Azure Key Vault resolution
([key-vault-secrets.loader.ts](../../src/azure-key-vault/key-vault-secrets.loader.ts))
must run and resolve *before* `AppModule` is ever imported — `main.ts` awaits
it, then dynamically `import()`s `AppModule`, because `@nestjs/config`'s env
validation runs synchronously at that module's import time. Keep this
ordering in mind if you refactor `main.ts` — moving the `AppModule` import
back to a static top-level import would silently skip Key Vault resolution.
