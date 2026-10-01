import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Expanders360 – Global Expansion Management API')
    .setDescription(
      'Clients, vendors and projects in MySQL; research documents in MongoDB; vendor matching and cross-DB analytics.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // classic Swagger UI at /docs
  app.use('/reference', apiReference({ content: document })); // Scalar at /reference

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API on :${port}  |  Scalar: /reference  |  Swagger UI: /docs`);
}
bootstrap();
