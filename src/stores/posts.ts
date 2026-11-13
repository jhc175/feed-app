import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { AddResult, Post } from '../types/post'
import { createId } from '../lib/id'
import { loadPosts, savePosts } from '../lib/storage'
import { MAX_LENGTH, countChars } from '../lib/text'

export const usePostsStore = defineStore('posts', () => {
  const posts = shallowRef<Post[]>([])
  const lastAddedId = shallowRef<string | null>(null)

  const sortedPosts = computed(() => [...posts.value].sort((a, b) => b.createdAt - a.createdAt))
  const total = computed(() => posts.value.length)
  const likedTotal = computed(() => posts.value.filter((post) => post.liked).length)

  function load(): void {
    posts.value = loadPosts()
    lastAddedId.value = null
  }

  function add(content: string): AddResult {
    const trimmed = content.trim()
    if (!trimmed) return { ok: false, reason: 'empty' }
    if (countChars(trimmed) > MAX_LENGTH) return { ok: false, reason: 'too-long' }

    const post: Post = { id: createId(), content: trimmed, createdAt: Date.now(), liked: false }
    const next = [post, ...posts.value]
    if (!savePosts(next)) return { ok: false, reason: 'storage' }

    posts.value = next
    lastAddedId.value = post.id
    return { ok: true, post }
  }

  function remove(id: string): boolean {
    if (!posts.value.some((post) => post.id === id)) return false

    const next = posts.value.filter((post) => post.id !== id)
    if (!savePosts(next)) return false

    posts.value = next
    return true
  }

  function toggleLike(id: string): boolean {
    if (!posts.value.some((post) => post.id === id)) return false

    const next = posts.value.map((post) => (post.id === id ? { ...post, liked: !post.liked } : post))
    if (!savePosts(next)) return false

    posts.value = next
    return true
  }

  return { posts, lastAddedId, sortedPosts, total, likedTotal, load, add, remove, toggleLike }
})
