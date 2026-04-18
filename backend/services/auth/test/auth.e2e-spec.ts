import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function ensureTestDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'transcendence_dev',
  });
  await client.connect();
  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = 'transcendence_test'`,
  );
  if (res.rowCount === 0) {
    await client.query('CREATE DATABASE transcendence_test');
  }
  await client.end();
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    await ensureTestDatabase();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE auth.users CASCADE');
  });

  afterAll(async () => {
    await app?.close();
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('201 — registers a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'drago@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.message).toBe('registered');
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.username).toBe('drago');
      expect(res.body.user.email).toBe('drago@example.com');
      expect(res.body.user.createdAt).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('409 — duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'drago@example.com', password: 'password123' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'other@example.com', password: 'password123' })
        .expect(409);
    });

    it('400 — username too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'ab', email: 'ab@example.com', password: 'password123' })
        .expect(400);
    });

    it('400 — password too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'drago@example.com', password: 'short' })
        .expect(400);
    });

    it('400 — missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'drago@example.com', password: 'password123' });
    });

    it('200 — returns a JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'password123' })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');
    });

    it('401 — wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'wrongpassword' })
        .expect(401);
    });

    it('401 — unknown username', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nobody', password: 'password123' })
        .expect(401);
    });

    it('401 — validation failure (password too short)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'short' })
        .expect(401);
    });
  });

  // ─── Change Password ─────────────────────────────────────────────────────────

  describe('PATCH /auth/password', () => {
    let token: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'drago', email: 'drago@example.com', password: 'password123' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'password123' });

      token = res.body.access_token;
    });

    it('200 — changes password and old password stops working', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'password123' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'drago', password: 'newpassword456' })
        .expect(200);
    });

    it('403 — wrong current password', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' })
        .expect(403);
    });

    it('400 — new password same as current', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'password123' })
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
        .expect(401);
    });

    it('401 — invalid token', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
        .expect(401);
    });

    it('400 — new password too short', async () => {
      await request(app.getHttpServer())
        .patch('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'short' })
        .expect(400);
    });
  });
});
