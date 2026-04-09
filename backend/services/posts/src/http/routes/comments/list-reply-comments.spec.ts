import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List reply comments tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list replies for a comment', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    await createComment({ userId, replyId: root.id, rootId: root.id })
    await createComment({ userId, replyId: root.id, rootId: root.id })

    const { status, data, error } = await api
      .comments({ commentId: root.id })
      .replies.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return replies in descending order', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    const first = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })
    const second = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })

    const { data } = await api.comments({ commentId: root.id }).replies.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
  })

  it('should return empty list if no replies', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })

    const { status, data } = await api
      .comments({ commentId: root.id })
      .replies.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(data?.comments).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to paginate with limit', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    await createComment({ userId, replyId: root.id, rootId: root.id })
    await createComment({ userId, replyId: root.id, rootId: root.id })
    await createComment({ userId, replyId: root.id, rootId: root.id })

    const { data } = await api.comments({ commentId: root.id }).replies.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    const first = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })
    const second = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })
    const third = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })

    const { data } = await api.comments({ commentId: root.id }).replies.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should only return direct replies, not nested replies', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    const replyA = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })
    await createComment({ userId, replyId: replyA.id, rootId: root.id })

    const { data } = await api.comments({ commentId: root.id }).replies.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(1)
    expect(data?.comments[0]?.id).toBe(replyA.id)
  })
})
