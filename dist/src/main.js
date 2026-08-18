"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const nestjs_pino_1 = require("nestjs-pino");
const key_vault_secrets_loader_1 = require("./azure-key-vault/key-vault-secrets.loader");
const config_service_1 = require("./config/config.service");
const SWAGGER_PATH = 'docs';
async function bootstrap() {
    await (0, key_vault_secrets_loader_1.loadKeyVaultSecrets)();
    const { AppModule } = await Promise.resolve().then(() => require('./app.module'));
    const app = await core_1.NestFactory.create(AppModule, { bufferLogs: true });
    const logger = app.get(nestjs_pino_1.Logger);
    app.useLogger(logger);
    app.enableShutdownHooks();
    const config = app.get(config_service_1.AppConfigService);
    if (!config.isProduction) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('bot-adapter')
            .setDescription('Microsoft Teams chatbot on Azure Bot Service — API reference')
            .setVersion('0.0.1')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup(SWAGGER_PATH, app, document);
    }
    await app.listen(config.port);
    if (!config.isProduction) {
        logger.log(`Swagger docs available at ${await app.getUrl()}/${SWAGGER_PATH}`, 'Bootstrap');
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map