import { createId } from '../src/lib/id'
import type { Post } from '../src/types/post'

export interface PostStore {
  /** createdAt 倒序的副本；createdAt 相同时后插入的在前。 */
  list(): Post[]
  find(id: string): Post | undefined
  /** content 已校验且已 trim。 */
  create(content: string): Post
  setLiked(id: string, liked: boolean): Post | undefined
  remove(id: string): boolean
  /** 清空全部数据，供测试使用。 */
  reset(): void
}

/**
 * 进程内内存存储：数组按插入顺序保存，对外只暴露副本，
 * 避免调用方改写内部状态。
 */
export function createPostStore(): PostStore {
  let posts: Post[] = []

  return {
    list(): Post[] {
      return posts
        .map((post, index) => ({ post, index }))
        .sort((a, b) => b.post.createdAt - a.post.createdAt || b.index - a.index)
        .map((entry) => ({ ...entry.post }))
    },
    find(id: string): Post | undefined {
      const found = posts.find((post) => post.id === id)
      return found ? { ...found } : undefined
    },
    create(content: string): Post {
      const post: Post = { id: createId(), content, createdAt: Date.now(), liked: false }
      posts.push(post)
      return { ...post }
    },
    setLiked(id: string, liked: boolean): Post | undefined {
      const target = posts.find((post) => post.id === id)
      if (!target) return undefined
      target.liked = liked
      return { ...target }
    },
    remove(id: string): boolean {
      const index = posts.findIndex((post) => post.id === id)
      if (index === -1) return false
      posts.splice(index, 1)
      return true
    },
    reset(): void {
      posts = []
    }
  }
}
