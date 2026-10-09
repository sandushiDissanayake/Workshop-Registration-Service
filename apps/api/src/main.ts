import './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './bootstrap';
import { loadConfig } from './config';

async function main() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app, config.corsOrigin);
  setupSwagger(app);
  await app.listen(config.port);
  console.log(`API listening on http://localhost:${config.port}  (Swagger: /docs)`);
}
main();
