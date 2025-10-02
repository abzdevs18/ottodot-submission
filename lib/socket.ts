// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import type { Server as NetServer, Socket } from 'net'
import type { NextApiResponse } from 'next'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer
    }
  }
}

export interface ServerToClientEvents {
  'problem:generated': (data: { sessionId: string; problemText: string }) => void
  'feedback:received': (data: { submissionId: string; feedback: string; isCorrect: boolean }) => void
  'student:activity': (data: { userId: string; userName: string; action: string; timestamp: string }) => void
  'queue:update': (data: { queueName: string; waiting: number; active: number; completed: number; failed: number }) => void
}

export interface ClientToServerEvents {
  'join:student': (userId: string) => void
  'join:teacher': () => void
  'join:admin': () => void
  'leave:room': (room: string) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId?: string
  role?: string
}

export const initSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id)

    socket.on('join:student', (userId) => {
      socket.data.userId = userId
      socket.data.role = 'student'
      socket.join(`student:${userId}`)
      console.log(`👨‍🎓 Student ${userId} joined`)
    })

    socket.on('join:teacher', () => {
      socket.data.role = 'teacher'
      socket.join('teachers')
      console.log('👨‍🏫 Teacher joined')
    })

    socket.on('join:admin', () => {
      socket.data.role = 'admin'
      socket.join('admins')
      console.log('👨‍💼 Admin joined')
    })

    socket.on('leave:room', (room) => {
      socket.leave(room)
      console.log(`Left room: ${room}`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id)
    })
  })

  console.log('✅ Socket.IO initialized')
  
  return io
}

// Helper function to emit to specific rooms
export const emitToStudent = (io: SocketIOServer, userId: string, event: keyof ServerToClientEvents, data: any) => {
  io.to(`student:${userId}`).emit(event, data)
}

export const emitToTeachers = (io: SocketIOServer, event: keyof ServerToClientEvents, data: any) => {
  io.to('teachers').emit(event, data)
}

export const emitToAdmins = (io: SocketIOServer, event: keyof ServerToClientEvents, data: any) => {
  io.to('admins').emit(event, data)
}
