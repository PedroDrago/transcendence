import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('FriendsController (e2e)', () => {
  let app: INestApplication<App>;

  const userA = {
    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    username: 'user_a_e2e',
  };
  const userB = {
    id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    username: 'user_b_e2e',
  };
  const nonExistentUserId = 'cccccccc-cccc-4ccc-accc-cccccccccccc';

  let friendshipId: string;

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

    // Pre-delete stale data from prior failed runs to prevent 409
    try { await request(app.getHttpServer()).delete(`/users/${userA.id}`).set('x-user-id', userA.id); } catch (e) {}
    try { await request(app.getHttpServer()).delete(`/users/${userB.id}`).set('x-user-id', userB.id); } catch (e) {}

    // Seed two users for the tests
    await request(app.getHttpServer())
      .post('/users')
      .send(userA)
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .send(userB)
      .expect(201);
  });

  afterAll(async () => {
    if (!app) return;

    // Cleanup: delete test users (cascades delete friendships)
    try {
      await request(app.getHttpServer()).delete(`/users/${userA.id}`).set('x-user-id', userA.id);
    } catch (e) {}
    try {
      await request(app.getHttpServer()).delete(`/users/${userB.id}`).set('x-user-id', userB.id);
    } catch (e) {}

    await app.close();
  });

  // ──────────────────────────────────────────────
  // Validation & Guard Tests
  // ──────────────────────────────────────────────

  it('POST /users/friends/requests should return 400 when x-user-id header is missing', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .send({ addresseeId: userB.id })
      .expect(400);
  });

  it('POST /users/friends/requests should return 400 when x-user-id is not a valid UUID', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', 'not-a-uuid')
      .send({ addresseeId: userB.id })
      .expect(400);
  });

  it('POST /users/friends/requests should return 400 when addresseeId is missing', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id)
      .send({})
      .expect(400);
  });

  it('POST /users/friends/requests should return 400 for self-request', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id)
      .send({ addresseeId: userA.id })
      .expect(400);
  });

  it('POST /users/friends/requests should return 404 when addressee does not exist', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id)
      .send({ addresseeId: nonExistentUserId })
      .expect(404);
  });

  // ──────────────────────────────────────────────
  // Happy Path: Send Request
  // ──────────────────────────────────────────────

  it('POST /users/friends/requests should create a PENDING request', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id)
      .send({ addresseeId: userB.id })
      .expect(201)
      .expect((res) => {
        expect(res.body.requesterId).toEqual(userA.id);
        expect(res.body.addresseeId).toEqual(userB.id);
        expect(res.body.status).toEqual('PENDING');
        expect(res.body.id).toBeDefined();
        friendshipId = res.body.id;
      });
  });

  it('POST /users/friends/requests should return 409 for duplicate request', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userA.id)
      .send({ addresseeId: userB.id })
      .expect(409);
  });

  it('POST /users/friends/requests should return 409 for reverse duplicate request', () => {
    return request(app.getHttpServer())
      .post('/users/friends/requests')
      .set('x-user-id', userB.id)
      .send({ addresseeId: userA.id })
      .expect(409);
  });

  // ──────────────────────────────────────────────
  // Pending Requests List
  // ──────────────────────────────────────────────

  it('GET /users/friends/requests should list pending requests for the addressee', () => {
    return request(app.getHttpServer())
      .get('/users/friends/requests')
      .set('x-user-id', userB.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].requester).toBeDefined();
        expect(res.body[0].requester.id).toEqual(userA.id);
        // Ensure dateOfBirth is NOT leaked (serialization check)
        expect(res.body[0].requester.dateOfBirth).toBeUndefined();
      });
  });

  it('GET /users/friends/requests should return empty for the requester', () => {
    return request(app.getHttpServer())
      .get('/users/friends/requests')
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(0);
      });
  });

  // ──────────────────────────────────────────────
  // Update Request Status
  // ──────────────────────────────────────────────

  it('PATCH /users/friends/requests/:id should return 403 if requester tries to accept', () => {
    return request(app.getHttpServer())
      .patch(`/users/friends/requests/${friendshipId}`)
      .set('x-user-id', userA.id)
      .send({ status: 'ACCEPTED' })
      .expect(403);
  });

  it('PATCH /users/friends/requests/:id should return 400 for invalid status', () => {
    return request(app.getHttpServer())
      .patch(`/users/friends/requests/${friendshipId}`)
      .set('x-user-id', userB.id)
      .send({ status: 'INVALID' })
      .expect(400);
  });

  it('PATCH /users/friends/requests/:id should accept the request', () => {
    return request(app.getHttpServer())
      .patch(`/users/friends/requests/${friendshipId}`)
      .set('x-user-id', userB.id)
      .send({ status: 'ACCEPTED' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toEqual('ACCEPTED');
      });
  });

  it('PATCH /users/friends/requests/:id should return 400 when updating an already accepted request', () => {
    return request(app.getHttpServer())
      .patch(`/users/friends/requests/${friendshipId}`)
      .set('x-user-id', userB.id)
      .send({ status: 'REJECTED' })
      .expect(400);
  });

  // ──────────────────────────────────────────────
  // Friends List
  // ──────────────────────────────────────────────

  it('GET /users/friends should list accepted friends for User A', () => {
    return request(app.getHttpServer())
      .get('/users/friends')
      .set('x-user-id', userA.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toEqual(userB.id);
        // Ensure dateOfBirth is NOT leaked (serialization check)
        expect(res.body[0].dateOfBirth).toBeUndefined();
      });
  });

  it('GET /users/friends should list accepted friends for User B', () => {
    return request(app.getHttpServer())
      .get('/users/friends')
      .set('x-user-id', userB.id)
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toEqual(userA.id);
      });
  });
});
