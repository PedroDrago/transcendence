import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { OAuthProvider, User } from '../src/users/user.entity';

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
  let jwtService: JwtService;

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
    jwtService = app.get(JwtService);
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
      expect(res.body.user.usernamePending).toBe(false);
      expect(res.body.user.createdAt).toBeDefined();
      expect(res.body.user.updatedAt).toBeDefined();
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
        .send({ identifier: 'drago', password: 'password123' })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');
    });

    it('200 — logs in with email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'drago@example.com', password: 'password123' })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
    });

    it('401 — wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'drago', password: 'wrongpassword' })
        .expect(401);
    });

    it('401 — unknown username', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'nobody', password: 'password123' })
        .expect(401);
    });

    it('401 — validation failure (password too short)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'drago', password: 'short' })
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
        .send({ identifier: 'drago', password: 'password123' });

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
        .send({ identifier: 'drago', password: 'password123' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'drago', password: 'newpassword456' })
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

  describe('PATCH /auth/username', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const created = await dataSource.getRepository(User).save({
        username: 'google_user',
        email: 'google@example.com',
        passwordHash: null,
        oauthProvider: OAuthProvider.GOOGLE,
        oauthId: 'google-oauth-id',
        usernamePending: true,
      });

      userId = created.id;
      token = jwtService.sign({
        typ: 'access',
        sub: created.id,
        username: created.username,
        email: created.email,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        usernamePending: true,
      });
    });

    it('200 — finalizes username and returns a fresh JWT', async () => {
      const res = await request(app.getHttpServer())
        .patch('/auth/username')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'drago' })
        .expect(200);

      expect(res.body.message).toBe('username updated');
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.username).toBe('drago');
      expect(res.body.user.usernamePending).toBe(false);

      const saved = await dataSource.query(
        'SELECT "username", "usernamePending" FROM auth.users WHERE id = $1',
        [userId],
      );
      expect(saved[0].username).toBe('drago');
      expect(saved[0].usernamePending).toBe(false);
    });
  });
});
