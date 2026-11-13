export const MAX_LENGTH = 280
export const WARN_LENGTH = 240

/**
 * 按 Unicode 码点计算长度，避免 emoji 被算成两个字符。
 */
export function countChars(text: string): number {
  return Array.from(text).length
}
