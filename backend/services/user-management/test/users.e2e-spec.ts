import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;

  // UUID v4 válido garantido para passar no ValidationPipe
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testUsername = 'tester_e2e';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Fundamental ativar os pipes globais no teste para que os DTOs funcionem
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    // Limpeza de segurança (fail-safe) caso algum teste quebre na metade
    try {
      await request(app.getHttpServer()).delete(`/users/${testUserId}`);
    } catch (e) {}

    await app.close();
  });

  it('/users (POST) should create a user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ id: testUserId, username: testUsername })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toEqual(testUserId);
        expect(res.body.username).toEqual(testUsername);
        // Garante que o fallback de imagem funcionou
        expect(res.body.avatarUrl).toContain('default-avatar');
      });
  });

  it('/users (POST) should return 409 Conflict when recreating', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ id: testUserId, username: 'another_user' })
      .expect(409);
  });

  it('/users (POST) should return 400 Bad Request for invalid UUID', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ id: 'invalid-uuid-123', username: testUsername })
      .expect(400);
  });

  it('/users/:id (DELETE) should remove the user', () => {
    return request(app.getHttpServer())
      .delete(`/users/${testUserId}`)
      .expect(204); // Atualizado de 200 para 204
  });

  it('/users/:id (DELETE) should return 404 Not Found if user does not exist', () => {
    return request(app.getHttpServer())
      .delete(`/users/${testUserId}`)
      .expect(404);
  });
});
