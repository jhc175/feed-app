export interface Post {
  id: string
  content: string
  createdAt: number
  liked: boolean
}

export type AddFailureReason = 'empty' | 'too-long' | 'storage'

export type AddResult =
  | { ok: true; post: Post }
  | { ok: false; reason: AddFailureReason }
