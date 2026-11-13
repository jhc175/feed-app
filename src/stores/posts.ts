import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { AddResult, Post } from '../types/post'
import { createPost, deletePost, listPosts, setPostLiked } from '../lib/api'
import { MAX_LENGTH, countChars } from '../lib/text'

export const usePostsStore = defineStore('posts', () => {
  const posts = shallowRef<Post[]>([])
  const lastAddedId = shallowRef<string | null>(null)
  const loading = shallowRef(false)

  const sortedPosts = computed(() => [...posts.value].sort((a, b) => b.createdAt - a.createdAt))
  const total = computed(() => posts.value.length)
  const likedTotal = computed(() => posts.value.filter((post) => post.liked).length)

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

    posts.value = posts.value.filter((post) => post.id !== id)
    return true
  }

  async function toggleLike(id: string): Promise<boolean> {
    const current = posts.value.find((post) => post.id === id)
    if (!current) return false

    try {
      const updated = await setPostLiked(id, !current.liked)
      posts.value = posts.value.map((post) => (post.id === id ? updated : post))
      return true
    } catch {
      return false
    }
  }

  return { posts, lastAddedId, loading, sortedPosts, total, likedTotal, load, add, remove, toggleLike }
})
