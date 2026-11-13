import { createId } from '../src/lib/id'
import type { Post, RepostSource } from '../src/types/post'

/** PATCH 允许改动的标记位，只带需要的字段。 */
export interface PostFlagsPatch {
  liked?: boolean
  bookmarked?: boolean
}

export interface PostStore {
  /** createdAt 倒序的副本；createdAt 相同时后插入的在前。 */
  list(): Post[]
  /** 只返回已收藏的帖子，排序规则与 list 一致。 */
  listBookmarked(): Post[]
  find(id: string): Post | undefined
  /** content 已校验且已 trim。 */
  create(content: string): Post
  /** 转发；源帖不存在时返回 undefined 且不写入任何数据。 */
  createRepost(sourceId: string, content: string): Post | undefined
  /** 局部更新 liked / bookmarked，未提交的字段保持原值。 */
  setFlags(id: string, patch: PostFlagsPatch): Post | undefined
  remove(id: string): boolean
  /** 清空全部数据，供测试使用。 */
  reset(): void
}

/** 对外出口统一走这里，连 repostOf 一起深拷贝一层。 */
function snapshot(post: Post): Post {
  return {
    ...post,
    repostOf: post.repostOf ? { ...post.repostOf } : null
  }
}

/** 结合原始插入下标做稳定排序：createdAt 倒序，相同时间后插入的在前。 */
function sortedPosts(posts: Post[]): Post[] {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => b.post.createdAt - a.post.createdAt || b.index - a.index)
    .map((entry) => snapshot(entry.post))
}

/**
 * 进程内内存存储：数组按插入顺序保存，对外只暴露副本，
 * 避免调用方改写内部状态。
 */
export function createPostStore(): PostStore {
  let posts: Post[] = []

  function findInternal(id: string): Post | undefined {
    return posts.find((post) => post.id === id)
  }

  return {
    list(): Post[] {
      return sortedPosts(posts)
    },
    listBookmarked(): Post[] {
      return sortedPosts(posts.filter((post) => post.bookmarked))
    },
    find(id: string): Post | undefined {
      const found = findInternal(id)
      return found ? snapshot(found) : undefined
    },
    create(content: string): Post {
      const post: Post = {
        id: createId(),
        content,
        createdAt: Date.now(),
        liked: false,
        bookmarked: false,
        repostOf: null,
        repostCount: 0
      }
      posts.push(post)
      return snapshot(post)
    },
    createRepost(sourceId: string, content: string): Post | undefined {
      const target = findInternal(sourceId)
      if (!target) return undefined

      // 转发永远是扁平的：转发转发帖时直接指向最初的原帖。
      const origin: RepostSource = target.repostOf
        ? { ...target.repostOf }
        : { id: target.id, content: target.content, createdAt: target.createdAt }

      const post: Post = {
        id: createId(),
        content,
        createdAt: Date.now(),
        liked: false,
        bookmarked: false,
        repostOf: origin,
        repostCount: 0
      }
      posts.push(post)

      // 最初原帖可能已被删除，此时只保留快照，不做计数。
      const originPost = findInternal(origin.id)
      if (originPost) originPost.repostCount += 1

      return snapshot(post)
    },
    setFlags(id: string, patch: PostFlagsPatch): Post | undefined {
      const target = findInternal(id)
      if (!target) return undefined

      if (patch.liked !== undefined) target.liked = patch.liked
      if (patch.bookmarked !== undefined) target.bookmarked = patch.bookmarked
      return snapshot(target)
    },
    remove(id: string): boolean {
      const index = posts.findIndex((post) => post.id === id)
      if (index === -1) return false

      const [removed] = posts.splice(index, 1)

      // 删掉自己的转发帖时回退原帖的转发计数；原帖已删除则跳过。
      if (removed.repostOf) {
        const originPost = findInternal(removed.repostOf.id)
        if (originPost) originPost.repostCount = Math.max(0, originPost.repostCount - 1)
      }

      return true
    },
    reset(): void {
      posts = []
    }
  }
}
