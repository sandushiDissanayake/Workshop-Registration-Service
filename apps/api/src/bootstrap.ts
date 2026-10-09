import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters';

export function configureApp(app: INestApplication, corsOrigin: string[]) {
  app.use(helmet());
  app.enableCors({ origin: corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
}

export function setupSwagger(app: INestApplication) {
  const doc = new DocumentBuilder().setTitle('Workshop Registration API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
}
