'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSocket } from '@/lib/hooks/useSocket'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  email: string
  progress: {
    totalProblems: number
    correctProblems: number
    accuracy: number
    currentStreak: number
    currentDifficulty: string
  } | null
  badges: Array<{ name: string; iconUrl: string }>
}

interface Analytics {
  overview: {
    totalStudents: number
    totalSessions: number
    totalSubmissions: number
    overallAccuracy: number
    avgSolveTime: number
  }
  recentActivity: {
    sessionsLast24h: number
    submissionsLast24h: number
  }
  difficultyDistribution: Array<{ level: string; count: number }>
  topPerformers: Array<{
    userId: string
    name: string
    totalProblems: number
    correctProblems: number
    accuracy: number
    currentStreak: number
  }>
}

interface ActivityLog {
  userId: string
  userName: string
  action: string
  timestamp: string
  isCorrect?: boolean
}

export default function TeacherDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const { socket, connected } = useSocket()
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'analytics'>('students')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.role !== 'TEACHER') {
      router.push(`/${user.role.toLowerCase()}`)
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadData()
      setupSocketListeners()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [studentsRes, analyticsRes] = await Promise.all([
        fetch('/api/teacher/students'),
        fetch('/api/teacher/analytics'),
      ])

      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data.students)
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupSocketListeners = () => {
    if (!socket) return

    socket.emit('join:teacher')

    socket.on('student:activity', (data: ActivityLog) => {
      console.log('Student activity:', data)
      setActivityLog((prev) => [data, ...prev].slice(0, 20)) // Keep last 20 activities
      
      // Optionally reload data to get fresh stats
      loadData()
    })
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <button
            onClick={() => logout()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Real-time Status */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {connected ? 'Real-time updates active' : 'Connecting...'}
              </span>
            </div>
            <button
              onClick={loadData}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('students')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                👨‍🎓 Students ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                📊 Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Recent Activity Log */}
        {activityLog.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">🔔 Recent Activity (Real-time)</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activityLog.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {activity.action === 'generated_problem' ? '✨' : 
                       activity.isCorrect ? '✅' : '📝'}
                    </span>
                    <div>
                      <div className="font-medium">{activity.userName}</div>
                      <div className="text-sm text-gray-600">
                        {activity.action === 'generated_problem' 
                          ? 'Generated a new problem' 
                          : `Submitted an answer ${activity.isCorrect ? '(Correct!)' : '(Incorrect)'}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      {student.badges.length > 0 && (
                        <div className="flex gap-1">
                          {student.badges.slice(0, 3).map((badge, idx) => (
                            <span key={idx} className="text-xl" title={badge.name}>
                              {badge.iconUrl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {student.progress ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {student.progress.totalProblems}
                          </div>
                          <div className="text-xs text-gray-600">Problems</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(student.progress.accuracy)}%
                          </div>
                          <div className="text-xs text-gray-600">Accuracy</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            🔥 {student.progress.currentStreak}
                          </div>
                          <div className="text-xs text-gray-600">Streak</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-sm font-bold text-purple-600">
                            {student.progress.currentDifficulty}
                          </div>
                          <div className="text-xs text-gray-600">Difficulty</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {student.badges.length}
                          </div>
                          <div className="text-xs text-gray-600">Badges</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No activity yet</p>
                    )}
                  </div>
                ))}

                {students.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No students found
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-blue-600">
                      {analytics.overview.totalStudents}
                    </div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-purple-600">
                      {analytics.overview.totalSessions}
                    </div>
                    <div className="text-sm text-gray-600">Total Problems</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.overview.totalSubmissions}
                    </div>
                    <div className="text-sm text-gray-600">Submissions</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-orange-600">
                      {analytics.overview.overallAccuracy}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Accuracy</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-3xl font-bold text-indigo-600">
                      {Math.round(analytics.overview.avgSolveTime)}s
                    </div>
                    <div className="text-sm text-gray-600">Avg Solve Time</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">📅 Last 24 Hours</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.recentActivity.sessionsLast24h}
                      </div>
                      <div className="text-sm text-gray-600">Problems Generated</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.recentActivity.submissionsLast24h}
                      </div>
                      <div className="text-sm text-gray-600">Answers Submitted</div>
                    </div>
                  </div>
                </div>

                {/* Difficulty Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">📊 Difficulty Distribution</h3>
                  <div className="space-y-3">
                    {analytics.difficultyDistribution.map((item) => {
                      const total = analytics.difficultyDistribution.reduce((sum, d) => sum + d.count, 0)
                      const percentage = total > 0 ? (item.count / total) * 100 : 0
                      return (
                        <div key={item.level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.level}</span>
                            <span className="text-gray-600">{item.count} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.level === 'EASY' ? 'bg-green-500' :
                                item.level === 'HARD' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">🏆 Top Performers</h3>
                  <div className="space-y-3">
                    {analytics.topPerformers.map((performer, index) => (
                      <div
                        key={performer.userId}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-yellow-600">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="font-bold">{performer.name}</div>
                            <div className="text-sm text-gray-600">
                              {performer.correctProblems}/{performer.totalProblems} problems · {Math.round(performer.accuracy)}% accuracy
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl">🔥</div>
                          <div className="text-sm font-semibold">{performer.currentStreak}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
