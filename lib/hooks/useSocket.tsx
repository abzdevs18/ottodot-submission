'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!socket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3011'
      
      // Determine if we're using integrated (Next.js) or standalone socket server
      const isIntegratedServer = socketUrl.includes('localhost:3000') || 
                                 socketUrl === window.location.origin
      
      socket = io(socketUrl, {
        path: isIntegratedServer ? '/api/socket' : undefined, // Only use path for integrated server
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socket.on('connect', () => {
        console.log('✅ Socket connected to:', socketUrl)
        setConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected')
        setConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message)
      })
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    }
  }, [])

  return { socket, connected }
}
