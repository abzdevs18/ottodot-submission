// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3001

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id)

  // Handle student joining
  socket.on('join:student', (userId: string) => {
    socket.join(`student:${userId}`)
    console.log(`👨‍🎓 Student ${userId} joined room`)
  })

  // Handle teacher joining
  socket.on('join:teacher', () => {
    socket.join('teachers')
    console.log('👨‍🏫 Teacher joined room')
  })

  // Handle admin joining
  socket.on('join:admin', () => {
    socket.join('admins')
    console.log('👨‍💼 Admin joined room')
  })

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`🔌 Socket.IO server running on http://localhost:${PORT}`)
})

export { io }
