import { serve } from '@hono/node-server'
import { createApp } from './app'

const port = Number(process.env.PORT ?? 3002)
const hostname = process.env.HOST ?? '127.0.0.1'

serve({ fetch: createApp().fetch, port, hostname }, (info) => {
  console.log(`[chirp-api] listening on http://${hostname}:${info.port}`)
})
