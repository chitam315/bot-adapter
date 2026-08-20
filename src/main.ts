import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { loadKeyVaultSecrets } from './azure-key-vault/key-vault-secrets.loader';
import { AppConfigService } from './config/config.service';
import { SWAGGER_PATH } from './constants';

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

  // Swagger documents whatever's actually decorated with @nestjs/swagger's
  // decorators — right now that's nothing beyond the routes themselves, so
  // it mainly gives a browsable route list. Skipped in production: no
  // reason to expose a route map to the outside world once deployed.
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('bot-adapter')
      .setDescription(
        'Microsoft Teams chatbot on Azure Bot Service — API reference',
      )
      .setVersion('0.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(SWAGGER_PATH, app, document);
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
