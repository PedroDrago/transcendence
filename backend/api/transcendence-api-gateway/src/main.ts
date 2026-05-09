import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module';
import { registerGatewayProxies } from './proxy/register-proxies';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
  }

  const jwtService = app.get(JwtService);
  registerGatewayProxies(
    app.getHttpAdapter().getInstance(),
    app.getHttpServer(),
    jwtService,
    {
      authServiceUrl:
        process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
      userServiceUrl:
        process.env.USER_SERVICE_URL ?? 'http://localhost:3002',
      chatServiceUrl:
        process.env.CHAT_SERVICE_URL ?? 'http://localhost:4002',
    },
  );
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
