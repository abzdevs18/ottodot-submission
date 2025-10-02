'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else {
        // Redirect based on role
        if (user.role === 'STUDENT') {
          router.push('/student')
        } else if (user.role === 'TEACHER') {
          router.push('/teacher')
        } else if (user.role === 'ADMIN') {
          router.push('/admin')
        }
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
        <p className="text-white text-xl font-semibold">Loading...</p>
      </div>
    </div>
  )
}