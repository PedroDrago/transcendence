import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (POST) should create a user', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    return request(app.getHttpServer())
      .post('/users')
      .send({ id, username: 'testuser' })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toEqual(id);
        expect(res.body.username).toEqual('testuser');
      });
  });

  it('/users/:id (DELETE) should remove the user', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    return request(app.getHttpServer())
      .delete(`/users/${id}`)
      .expect(200);
  });
});
