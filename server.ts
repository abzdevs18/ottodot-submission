// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketIO } from './lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Configure Next.js
const app = next({ 
  dev, 
  hostname, 
  port,
  dir: '.'
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = initSocketIO(httpServer)

  // Store io instance globally for API routes to access
  ;(global as any).io = io

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
