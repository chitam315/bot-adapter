import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { Response } from 'express';
import { Logger } from 'nestjs-pino';
import { loadKeyVaultSecrets } from './azure-key-vault/key-vault-secrets.loader';
import { AppConfigService } from './config/config.service';
import { FAVICON_FILE, FAVICON_URL_PATH, SWAGGER_PATH } from './constants';

async function bootstrap() {
  // Must resolve before AppModule is imported: @nestjs/config validates
  // process.env synchronously as an import-time side effect of
  // config.module.ts's @Module() decorator, so Key Vault secrets need to
  // land in process.env before that file is ever required.
  await loadKeyVaultSecrets();

  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const config = app.get(AppConfigService);

  // JwtAuthGuard reads the SSO token from a cookie, so this runs
  // unconditionally (not just when Swagger is up) — needed in production too.
  app.use(cookieParser());

  // Serves just this one file, not a whole static directory — the project
  // root also holds .env/src/package.json, which a general static-assets
  // mount would expose alongside it.
  const favicon = readFileSync(join(process.cwd(), FAVICON_FILE));
  app.use(FAVICON_URL_PATH, (_req: unknown, res: Response) => {
    res.type('image/x-icon').send(favicon);
  });

  // Swagger documents whatever's actually decorated with @nestjs/swagger's
  // decorators — right now that's the routes themselves plus the cookie-auth
  // security scheme on AiController. Skipped in production: no reason to
  // expose a route map to the outside world once deployed.
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('bot-adapter')
      .setDescription(
        'Microsoft Teams chatbot on Azure Bot Service — API reference',
      )
      .setVersion('0.0.1')
      .addCookieAuth(config.sso.cookieName)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(SWAGGER_PATH, app, document, {
      customfavIcon: FAVICON_URL_PATH,
    });
  }

  await app.listen(config.port);

  if (!config.isProduction) {
    logger.log(
      `Swagger docs available at ${await app.getUrl()}/${SWAGGER_PATH}`,
      'Bootstrap',
    );
  }
}
void bootstrap();
