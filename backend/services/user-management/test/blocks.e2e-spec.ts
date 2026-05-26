import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('BlockController (e2e)', () => {
  let app: INestApplication<App>;

  const userA = {
    id: '11111111-1111-4111-a111-111111111111',
    username: 'user_a_block_e2e',
  };
  const userB = {
    id: '22222222-2222-4222-a222-222222222222',
    username: 'user_b_block_e2e',
  };
  const userC = {
    id: '33333333-3333-4333-a333-333333333333',
    username: 'user_c_block_e2e',
  };
  const nonExistentUserId = 'cccccccc-cccc-4ccc-accc-cccccccccccc';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();

    // Pre-delete stale data to prevent 409
    try { await request(app.getHttpServer()).delete(`/users/${userA.id}`); } catch (e) {}
    try { await request(app.getHttpServer()).delete(`/users/${userB.id}`); } catch (e) {}
    try { await request(app.getHttpServer()).delete(`/users/${userC.id}`); } catch (e) {}

    // Seed users
    await request(app.getHttpServer()).post('/users').send(userA).expect(201);
    await request(app.getHttpServer()).post('/users').send(userB).expect(201);
    await request(app.getHttpServer()).post('/users').send(userC).expect(201);
  });

  afterAll(async () => {
    if (!app) return;

    // Cleanup: delete test users (cascades delete friendships and blocks)
    try { await request(app.getHttpServer()).delete(`/users/${userA.id}`); } catch (e) {}
    try { await request(app.getHttpServer()).delete(`/users/${userB.id}`); } catch (e) {}
    try { await request(app.getHttpServer()).delete(`/users/${userC.id}`); } catch (e) {}

    await app.close();
  });

  // ──────────────────────────────────────────────
  // Validation & Guard Tests
  // ──────────────────────────────────────────────

  it('POST /users/blocks should return 400 when x-user-id header is missing', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .send({ blockedId: userB.id })
      .expect(400);
  });

  it('POST /users/blocks should return 400 when blockedId is invalid UUID', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: 'not-a-uuid' })
      .expect(400);
  });

  it('POST /users/blocks should return 400 for self-block', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: userA.id })
      .expect(400);
  });

  it('POST /users/blocks should return 404 when target does not exist', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: nonExistentUserId })
      .expect(404);
  });

  // ──────────────────────────────────────────────
  // Happy Path: Block User
  // ──────────────────────────────────────────────

  it('GET /users/blocks/:targetId/status should return all false before block', () => {
    return request(app.getHttpServer())
      .get(`/users/blocks/${userB.id}/status`)
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ blockedByMe: false, blockedMe: false, isBlocked: false });
      });
  });

  it('POST /users/blocks should block user B', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: userB.id })
      .expect(201);
  });

  it('POST /users/blocks should return 409 for duplicate block', () => {
    return request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: userB.id })
      .expect(409);
  });

  it('GET /users/blocks/:targetId/status should reflect block status for user A', () => {
    return request(app.getHttpServer())
      .get(`/users/blocks/${userB.id}/status`)
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ blockedByMe: true, blockedMe: false, isBlocked: true });
      });
  });

  it('GET /users/blocks/:targetId/status should reflect block status for user B', () => {
    return request(app.getHttpServer())
      .get(`/users/blocks/${userA.id}/status`)
      .set('x-user-id', userB.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ blockedByMe: false, blockedMe: true, isBlocked: true });
      });
  });

  it('GET /users/blocks should list blocked users', () => {
    return request(app.getHttpServer())
      .get('/users/blocks')
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toEqual(userB.id);
        expect(res.body[0].dateOfBirth).toBeUndefined(); // Serialization check
      });
  });

  // ──────────────────────────────────────────────
  // Interception / Prevention
  // ──────────────────────────────────────────────

  it('POST /users/friends/requests should return 403 when blocked', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id) // A blocked B
      .send({ addresseeId: userB.id })
      .expect(403);
  });

  it('POST /users/friends/requests should return 403 when trying to add a user who blocked you', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userB.id) // A blocked B
      .send({ addresseeId: userA.id })
      .expect(403);
  });

  // ──────────────────────────────────────────────
  // Transactional Cleanup (Friendship Deletion)
  // ──────────────────────────────────────────────

  it('should remove existing friendship when blocking', async () => {
    // 1. C sends request to A
    await request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userC.id)
      .send({ addresseeId: userA.id })
      .expect(201);

    // 2. A blocks C
    await request(app.getHttpServer())
      .post('/users/blocks')
      .set('x-user-id', userA.id)
      .send({ blockedId: userC.id })
      .expect(201);

    // 3. Pending request should be gone
    await request(app.getHttpServer())
      .get('/users/friends/requests')
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(0); // C's request is gone
      });
  });

  // ──────────────────────────────────────────────
  // Unblock User
  // ──────────────────────────────────────────────

  it('DELETE /users/blocks/:id should unblock the user', () => {
    return request(app.getHttpServer())
      .delete(`/users/blocks/${userB.id}`)
      .set('x-user-id', userA.id)
      .expect(200);
  });

  it('GET /users/blocks/:targetId/status should return false after unblocking', () => {
    return request(app.getHttpServer())
      .get(`/users/blocks/${userB.id}/status`)
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ blockedByMe: false, blockedMe: false, isBlocked: false });
      });
  });
});
