import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { AddResult, Post } from '../types/post'
import {
  createPost,
  deletePost,
  listPosts,
  repostPost,
  updatePost
} from '../lib/api'
import { MAX_LENGTH, countChars } from '../lib/text'

export const usePostsStore = defineStore('posts', () => {
  const posts = shallowRef<Post[]>([])
  const lastAddedId = shallowRef<string | null>(null)
  const loading = shallowRef(false)
  /** 时间线是否只看收藏 */
  const bookmarkedOnly = shallowRef(false)

  const sortedPosts = computed(() => [...posts.value].sort((a, b) => b.createdAt - a.createdAt))
  const visiblePosts = computed(() =>
    bookmarkedOnly.value ? sortedPosts.value.filter((post) => post.bookmarked) : sortedPosts.value
  )
  const total = computed(() => posts.value.length)
  const likedTotal = computed(() => posts.value.filter((post) => post.liked).length)
  const bookmarkedTotal = computed(() => posts.value.filter((post) => post.bookmarked).length)

  async function load(): Promise<boolean> {
    loading.value = true
    try {
      posts.value = await listPosts()
      lastAddedId.value = null
      return true
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  async function add(content: string): Promise<AddResult> {
    const trimmed = content.trim()
    if (!trimmed) return { ok: false, reason: 'empty' }
    if (countChars(trimmed) > MAX_LENGTH) return { ok: false, reason: 'too-long' }

    try {
      const post = await createPost(trimmed)
      posts.value = [post, ...posts.value]
      lastAddedId.value = post.id
      return { ok: true, post }
    } catch {
      return { ok: false, reason: 'network' }
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await deletePost(id)
    } catch {
      return false
    }

    const removed = posts.value.find((post) => post.id === id)
    const sourceId = removed?.repostOf?.id ?? null

    posts.value = posts.value
      .filter((post) => post.id !== id)
      .map((post) =>
        sourceId !== null && post.id === sourceId
          ? { ...post, repostCount: Math.max(0, post.repostCount - 1) }
          : post
      )
    return true
  }

  async function toggleLike(id: string): Promise<boolean> {
    const current = posts.value.find((post) => post.id === id)
    if (!current) return false

    try {
      const updated = await updatePost(id, { liked: !current.liked })
      posts.value = posts.value.map((post) => (post.id === id ? updated : post))
      return true
    } catch {
      return false
    }
  }

  async function toggleBookmark(id: string): Promise<boolean> {
    const current = posts.value.find((post) => post.id === id)
    if (!current) return false

    try {
      const updated = await updatePost(id, { bookmarked: !current.bookmarked })
      posts.value = posts.value.map((post) => (post.id === id ? updated : post))
      return true
    } catch {
      return false
    }
  }

  /** 转发某条帖子：新帖插到首位，源帖转发数本地 +1。 */
  async function repost(id: string): Promise<boolean> {
    const target = posts.value.find((post) => post.id === id)
    if (!target) return false

    try {
      const created = await repostPost(id)
      const sourceId = created.repostOf?.id ?? id
      posts.value = [
        created,
        ...posts.value.map((post) =>
          post.id === sourceId ? { ...post, repostCount: post.repostCount + 1 } : post
        )
      ]
      lastAddedId.value = created.id
      return true
    } catch {
      return false
    }
  }

  return {
    posts,
    lastAddedId,
    loading,
    bookmarkedOnly,
    sortedPosts,
    visiblePosts,
    total,
    likedTotal,
    bookmarkedTotal,
    load,
    add,
    remove,
    toggleLike,
    toggleBookmark,
    repost
  }
})
