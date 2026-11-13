/**
 * 转发时对源帖做的快照。源帖被删除后，转发内容依然能完整展示，
 * 因此这里存的是值而不是引用。
 */
export interface RepostSource {
  id: string
  content: string
  createdAt: number
}

export interface Post {
  id: string
  /** 自己写的文本；纯转发（不带转发语）时为空字符串 */
  content: string
  createdAt: number
  liked: boolean
  bookmarked: boolean
  /** null 表示原创；非 null 表示这是对源帖的转发（不会嵌套，转发转发帖时指向其源帖） */
  repostOf: RepostSource | null
  /** 被转发次数；删除自身的转发帖时回退 */
  repostCount: number
}

export type AddFailureReason = 'empty' | 'too-long' | 'network'

export type AddResult =
  | { ok: true; post: Post }
  | { ok: false; reason: AddFailureReason }
