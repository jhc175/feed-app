export interface Post {
  id: string
  content: string
  createdAt: number
  liked: boolean
}

export type AddFailureReason = 'empty' | 'too-long' | 'network'

export type AddResult =
  | { ok: true; post: Post }
  | { ok: false; reason: AddFailureReason }
