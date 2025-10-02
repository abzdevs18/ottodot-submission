'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface QueueStats {
  name: string
  queueName: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [queues, setQueues] = useState<QueueStats[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.role !== 'ADMIN') {
      router.push(`/${user.role.toLowerCase()}`)
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadQueues()
    }
  }, [user])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(loadQueues, 5000) // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const loadQueues = async () => {
    try {
      const response = await fetch('/api/admin/queues')
      if (response.ok) {
        const data = await response.json()
        setQueues(data.queues)
      }
    } catch (error) {
      console.error('Failed to load queues:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const totalJobs = queues.reduce((sum, q) => sum + q.waiting + q.active + q.completed + q.failed, 0)
  const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0)
  const totalActive = queues.reduce((sum, q) => sum + q.active, 0)
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">System monitoring and management</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition ${
                autoRefresh
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>
            <button
              onClick={() => logout()}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{totalJobs}</div>
            <div className="text-sm text-gray-600">Total Jobs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{totalWaiting}</div>
            <div className="text-sm text-gray-600">Waiting</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{totalActive}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{totalFailed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        {/* Queue Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">🔧 BullMQ Queue Status</h2>
              <button
                onClick={loadQueues}
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                🔄 Refresh Now
              </button>
            </div>
            {autoRefresh && (
              <p className="text-xs text-green-600 mt-1">● Auto-refreshing every 5 seconds</p>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading queue stats...</p>
            </div>
          ) : (
            <div className="p-6">
              {queues.map((queue) => (
                <div key={queue.queueName} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">{queue.name}</h3>
                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                      {queue.queueName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{queue.waiting}</div>
                      <div className="text-xs text-gray-600 mt-1">⏳ Waiting</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{queue.active}</div>
                      <div className="text-xs text-gray-600 mt-1">⚡ Active</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{queue.completed}</div>
                      <div className="text-xs text-gray-600 mt-1">✅ Completed</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{queue.failed}</div>
                      <div className="text-xs text-gray-600 mt-1">❌ Failed</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{queue.delayed}</div>
                      <div className="text-xs text-gray-600 mt-1">⏰ Delayed</div>
                    </div>
                  </div>

                  {/* Health indicator */}
                  <div className="mt-3">
                    {queue.failed > 0 && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                        ⚠️ Warning: {queue.failed} failed job(s) detected
                      </div>
                    )}
                    {queue.waiting > 10 && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm mt-2">
                        ℹ️ High queue backlog: {queue.waiting} jobs waiting
                      </div>
                    )}
                    {queue.failed === 0 && queue.waiting === 0 && queue.active === 0 && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                        ✅ Queue is healthy and idle
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {queues.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No queues configured
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">ℹ️ System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700 mb-2">Queue System</div>
              <div className="space-y-1 text-gray-600">
                <p>• Technology: BullMQ + Redis</p>
                <p>• Concurrency: 5 workers per queue</p>
                <p>• Retry Strategy: Exponential backoff</p>
                <p>• Max Retries: 3 attempts</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700 mb-2">Real-time Updates</div>
              <div className="space-y-1 text-gray-600">
                <p>• Technology: Socket.IO</p>
                <p>• Events: Problem generation, Feedback, Student activity</p>
                <p>• Rooms: Student, Teacher, Admin</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700 mb-2">Database</div>
              <div className="space-y-1 text-gray-600">
                <p>• Database: PostgreSQL (Supabase)</p>
                <p>• ORM: Prisma</p>
                <p>• Connection Pooling: PgBouncer</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-700 mb-2">AI Provider</div>
              <div className="space-y-1 text-gray-600">
                <p>• Provider: Google Generative AI</p>
                <p>• Model: Gemini Pro</p>
                <p>• Features: Problem generation, Adaptive feedback</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 border border-blue-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🚀 Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/teacher')}
              className="bg-white hover:bg-gray-50 border-2 border-blue-300 text-gray-800 font-semibold py-4 px-6 rounded-lg transition"
            >
              👨‍🏫 View Teacher Dashboard
            </button>
            <button
              onClick={() => router.push('/student')}
              className="bg-white hover:bg-gray-50 border-2 border-blue-300 text-gray-800 font-semibold py-4 px-6 rounded-lg transition"
            >
              👨‍🎓 View Student Dashboard
            </button>
            <button
              onClick={loadQueues}
              className="bg-white hover:bg-gray-50 border-2 border-blue-300 text-gray-800 font-semibold py-4 px-6 rounded-lg transition"
            >
              🔄 Force Refresh All Data
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
