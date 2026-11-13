/**
 * 生成帖子 ID：优先用 crypto.randomUUID，老浏览器/非安全上下文降级为时间戳 + 随机串。
 */
export function createId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    try {
      return cryptoApi.randomUUID()
    } catch {
      // 落到降级分支
    }
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
