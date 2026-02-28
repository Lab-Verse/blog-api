import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);
  const frontendUrlStr = configService.get<string>('FRONTEND_URL') || '';
  const adminUrlStr = configService.get<string>('ADMIN_PANEL_URL') || '';
  // Support comma-separated origins (e.g. "http://localhost:3001,https://watt.com.pk")
  const origins = [...frontendUrlStr.split(','), ...adminUrlStr.split(',')]
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
