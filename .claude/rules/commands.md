## Commands

```bash
npm run start:dev              # run with hot reload (port from .env, default 3000)
npm run build                  # compile to dist/
npm run lint                   # eslint --fix over src/apps/libs/test

npm test                       # unit tests (*.spec.ts, co-located with source)
npm run test:e2e               # e2e tests (test/*.e2e-spec.ts)
npm run test:cov               # unit tests with coverage
npx jest path/to/file.spec.ts                  # single unit test file
npx jest -t "test name substring"              # by test name (any file)
npx jest --config ./test/jest-e2e.json test/foo.e2e-spec.ts   # single e2e file

npm run db:pull                # introspect the live DB into src/database/schema/_generated/ (never overwrites schema.ts directly)
npm run db:push                # push schema.ts to a local/throwaway DB, no migration file
npm run db:generate            # write a migration from schema.ts vs. drizzle/ history
npm run db:migrate             # apply pending migrations (explicit release step, not run at boot)
npm run db:studio              # local Drizzle Studio GUI
```

Local dev: `cp .env.example .env`, fill in real values, then point the [Bot
Framework Emulator](https://github.com/microsoft/BotFramework-Emulator) at
`http://localhost:3000/api/messages` (leave `MICROSOFT_APP_ID` empty for
unauthenticated local testing).
