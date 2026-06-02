import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createComment } from '@test/helpers/create-comment'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'
import { mockFriendIds } from '@test/helpers/mock-friend-ids'

const REGEX = /^http/

describe('List feed tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it("should return the viewer's own posts in the feed", async () => {
    await createPost({ userId, caption: 'my post 1' })
    await createPost({ userId, caption: 'my post 2' })

    const { status, data, error } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.posts).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it("should include friends' posts in the feed", async () => {
    const friendId = uuidv7()
    const nonFriendId = uuidv7()

    await createPost({ userId, caption: 'my post' })
    await createPost({ userId: friendId, caption: "friend's post" })
    await createPost({ userId: nonFriendId, caption: "non-friend's post" })

    const restore = mockFriendIds([friendId])

    const { status, data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    restore()

    expect(status).toBe(200)
    expect(data?.posts).toHaveLength(2)

    const authorIds = data?.posts.map((p) => p.userId) ?? []
    expect(authorIds).toContain(userId)
    expect(authorIds).toContain(friendId)
    expect(authorIds).not.toContain(nonFriendId)
  })

  it('should not include posts from non-friends', async () => {
    const nonFriendId = uuidv7()
    await createPost({ userId, caption: 'my post' })
    await createPost({ userId: nonFriendId, caption: "non-friend's post" })

    const { data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts).toHaveLength(1)
    expect(data?.posts[0]?.userId).toBe(userId)
  })

  it('should return an empty feed when user has no posts and no friends', async () => {
    const { status, data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(status).toBe(200)
    expect(data?.posts).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return posts with signed media URLs', async () => {
    await createPost({ userId })

    const { data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts[0]?.mediaUrl).toMatch(REGEX)
  })

  it('should return posts in descending order', async () => {
    const first = await createPost({ userId, caption: 'first' })
    const second = await createPost({ userId, caption: 'second' })

    const { data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts[0]?.id).toBe(second.id)
    expect(data?.posts[1]?.id).toBe(first.id)
  })

  it('should paginate with limit', async () => {
    await createPost({ userId, caption: 'post 1' })
    await createPost({ userId, caption: 'post 2' })
    await createPost({ userId, caption: 'post 3' })

    const { data } = await api.posts.feed.get({
      query: { limit: 2 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should paginate correctly with cursor', async () => {
    const first = await createPost({ userId, caption: 'post 1' })
    await createPost({ userId, caption: 'post 2' })
    await createPost({ userId, caption: 'post 3' })

    const firstPage = await api.posts.feed.get({
      query: { limit: 2 },
      headers: { 'x-user-id': userId },
    })

    const nextCursor = firstPage.data?.nextCursor
    expect(nextCursor).toBeTruthy()

    const { data } = await api.posts.feed.get({
      query: {
        cursor: nextCursor as string,
        limit: 2,
      },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts).toHaveLength(1)
    expect(data?.posts[0]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return likeCount and commentCount per post', async () => {
    const { id: postId } = await createPost({ userId })
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId })
    const { id: commentId } = await createComment({ userId, postId })
    await createComment({ userId, postId })
    await createComment({ userId, replyId: commentId, rootId: commentId })

    const { data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts[0]?.likeCount).toBe(2)
    expect(data?.posts[0]?.commentCount).toBe(2)
  })

  it('should return 0 counts when post has no likes or comments', async () => {
    await createPost({ userId })

    const { data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(data?.posts[0]?.likeCount).toBe(0)
    expect(data?.posts[0]?.commentCount).toBe(0)
  })

  it('should degrade gracefully and return only own posts when user service is unavailable', async () => {
    const friendId = uuidv7()
    await createPost({ userId, caption: 'my post' })
    await createPost({ userId: friendId, caption: "friend's post" })

    const { status, data } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: { 'x-user-id': userId },
    })

    expect(status).toBe(200)
    expect(data?.posts).toHaveLength(1)
    expect(data?.posts[0]?.userId).toBe(userId)
  })

  it('should return 401 when x-user-id header is missing', async () => {
    const { status } = await api.posts.feed.get({
      query: { limit: 20 },
      headers: {},
    })

    expect(status).toBe(401)
  })
})
