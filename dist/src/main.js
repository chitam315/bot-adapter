"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const nestjs_pino_1 = require("nestjs-pino");
const key_vault_secrets_loader_1 = require("./azure-key-vault/key-vault-secrets.loader");
const config_service_1 = require("./config/config.service");
async function bootstrap() {
    await (0, key_vault_secrets_loader_1.loadKeyVaultSecrets)();
    const { AppModule } = await Promise.resolve().then(() => require('./app.module'));
    const app = await core_1.NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.enableShutdownHooks();
    const config = app.get(config_service_1.AppConfigService);
    await app.listen(config.port);
}
void bootstrap();
//# sourceMappingURL=main.js.map