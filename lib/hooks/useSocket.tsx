'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: '/api/socket',
      })

      socket.on('connect', () => {
        console.log('✅ Socket connected')
        setConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected')
        setConnected(false)
      })
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    }
  }, [])

  return { socket, connected }
}
