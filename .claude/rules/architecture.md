## Module layout

Feature-based module layout — each feature owns its own
`*.module.ts`/`*.service.ts`/`*.controller.ts`/`*.spec.ts` in one folder
(`ai/`, `auth/`, `azure-key-vault/`, `azure-openai/`, `bot/`, `config/`,
`conversation-logging/`, `core/`, `database/`, `health/`, `knowledge-base/`,
`shared/`). `DatabaseModule` and `ConfigModule` are the only modules imported
by more than one feature; `ConfigModule` is the one `@Global()` module.

## Constants are centralized, not per-module

Every DI token (`Symbol`), magic value, and enum lives under
`src/constants/*.constants.ts`, barrel re-exported from
`src/constants/index.ts` — import from `'../constants'` (or `'./constants'`),
never a per-module constants file. When adding a new DI token or shared
literal, add it to the relevant file there (or create one) rather than
declaring it next to the class that uses it.
