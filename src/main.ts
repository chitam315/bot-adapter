import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { loadKeyVaultSecrets } from './azure-key-vault/key-vault-secrets.loader';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  // Must resolve before AppModule is imported: @nestjs/config validates
  // process.env synchronously as an import-time side effect of
  // config.module.ts's @Module() decorator, so Key Vault secrets need to
  // land in process.env before that file is ever required.
  await loadKeyVaultSecrets();

  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const config = app.get(AppConfigService);
  await app.listen(config.port);
}
void bootstrap();
