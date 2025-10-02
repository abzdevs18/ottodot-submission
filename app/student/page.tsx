'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSocket } from '@/lib/hooks/useSocket'
import { useRouter } from 'next/navigation'

interface Problem {
  id: string
  problemText: string
  difficultyLevel: string
  jobStatus: string
}

interface Progress {
  totalProblems: number
  correctProblems: number
  currentStreak: number
  longestStreak: number
  currentDifficulty: string
}

interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
  earnedAt: string
}

export default function StudentDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const { socket, connected } = useSocket()
  const router = useRouter()

  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [startTime, setStartTime] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [attemptHistory, setAttemptHistory] = useState<Array<{answer: string, feedback: string, isCorrect: boolean}>>([])


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.role !== 'STUDENT') {
      router.push(`/${user.role.toLowerCase()}`)
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadProgress()
      setupSocketListeners()
    }
  }, [user])

  const loadProgress = async () => {
    try {
      const response = await fetch('/api/progress')
      if (response.ok) {
        const data = await response.json()
        setProgress(data.progress)
        setBadges(data.badges)
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
  }

  const setupSocketListeners = () => {
    if (!socket || !user) return

    socket.emit('join:student', user.id)

    socket.on('problem:generated', async (data) => {
      console.log('Problem generated:', data)
      // Fetch the complete problem
      const response = await fetch(`/api/problems/${data.sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        setCurrentProblem(sessionData.session)
        setLoading(false)
        setStartTime(Date.now())
      }
    })

    socket.on('feedback:ready', (data) => {
      console.log('Feedback ready:', data)
      if (data.userId === user.id) {
        setFeedback(data.feedback)
        setIsCorrect(data.isCorrect)
        setLoading(false)
        loadProgress() // Reload progress to show updated stats
      }
    })

    // Legacy support for old event name
    socket.on('feedback:received', (data) => {
      console.log('Feedback received:', data)
      setFeedback(data.feedback)
      setIsCorrect(data.isCorrect)
      setLoading(false)
      loadProgress()
    })
  }

  const generateProblem = async () => {
    setLoading(true)
    setFeedback('')
    setIsCorrect(null)
    setUserAnswer('')
    setCurrentProblem(null)
    setAttemptHistory([]) // Clear history when generating new problem

    try {
      const response = await fetch('/api/problems/generate', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate problem')
      }

      const data = await response.json()
      
      // Poll for problem completion
      pollProblemStatus(data.sessionId)
    } catch (error) {
      console.error('Error generating problem:', error)
      setLoading(false)
      alert('Failed to generate problem. Please try again.')
    }
  }

  const pollProblemStatus = async (sessionId: string) => {
    const maxAttempts = 20 // 60 seconds timeout (20 * 3s)
    let attempts = 0

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/problems/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.session.jobStatus === 'completed') {
            setCurrentProblem(data.session)
            setLoading(false)
            setStartTime(Date.now())
            return true
          } else if (data.session.jobStatus === 'failed') {
            setLoading(false)
            alert('Failed to generate problem. Please try again.')
            return true
          }
        }
        return false
      } catch (error) {
        console.error('Error checking status:', error)
        return false
      }
    }

    // Check immediately first, then poll every 3 seconds
    const completed = await checkStatus()
    if (completed) return

    const interval = setInterval(async () => {
      attempts++
      const completed = await checkStatus()
      
      if (completed || attempts >= maxAttempts) {
        clearInterval(interval)
        if (attempts >= maxAttempts && !completed) {
          setLoading(false)
          alert('Problem generation timed out. Please try again.')
        }
      }
    }, 3000) // Poll every 3 seconds instead of 1 second
  }

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback('')

    const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : null

    try {
      const response = await fetch('/api/problems/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentProblem?.id,
          userAnswer: parseFloat(userAnswer),
          timeTaken,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit answer')
      }

      const data = await response.json()
      setIsCorrect(data.isCorrect)
      
      // Poll for feedback
      pollFeedbackStatus(data.submissionId)
    } catch (error) {
      console.error('Error submitting answer:', error)
      setLoading(false)
      alert('Failed to submit answer. Please try again.')
    }
  }

  const pollFeedbackStatus = async (submissionId: string) => {
    const maxAttempts = 20 // 60 seconds max (20 * 3s)
    let attempts = 0

    const checkFeedback = async () => {
      try {
        const response = await fetch(`/api/problems/submission/${submissionId}`)
        if (response.ok) {
          const data = await response.json()
          const submission = data.submission
          
          // Check if feedback is ready (not the default "Generating feedback..." message)
          if (submission.feedbackText && submission.feedbackText !== 'Generating feedback...') {
            setFeedback(submission.feedbackText)
            setLoading(false)
            loadProgress() // Refresh progress stats
            
            // Add to attempt history
            setAttemptHistory(prev => [...prev, {
              answer: userAnswer,
              feedback: submission.feedbackText,
              isCorrect: submission.isCorrect
            }])
            
            return true
          }
        }
      } catch (error) {
        console.error('Error polling feedback:', error)
      }
      return false
    }

    // Check immediately first
    const hasFeeback = await checkFeedback()
    if (hasFeeback) return

    // Then poll every 3 seconds
    const interval = setInterval(async () => {
      attempts++
      const hasFeedback = await checkFeedback()

      if (hasFeedback || attempts >= maxAttempts) {
        clearInterval(interval)
        if (attempts >= maxAttempts && !hasFeedback) {
          setLoading(false)
          setFeedback('Feedback generation timed out. Please try again.')
        }
      }
    }, 3000) // Poll every 3 seconds instead of 1 second
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const accuracy = progress && progress.totalProblems > 0 
    ? Math.round((progress.correctProblems / progress.totalProblems) * 100) 
    : 0

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Button - Only show when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-gray-900 text-white flex flex-col
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-700 relative">
          {/* Close button for mobile - positioned on the right */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent pr-8 lg:pr-0">
            Math AI Tutor
          </h1>
          <p className="text-xs text-gray-400 mt-1">Powered by Claude</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Stats</h3>
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Problems</span>
                  <span className="text-lg font-bold text-blue-400">{progress?.totalProblems || 0}</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Accuracy</span>
                  <span className="text-lg font-bold text-green-400">{accuracy}%</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Streak</span>
                  <span className="text-lg font-bold text-orange-400">🔥 {progress?.currentStreak || 0}</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Level</span>
                  <span className="text-sm font-semibold text-purple-400">{progress?.currentDifficulty || 'MEDIUM'}</span>
                </div>
              </div>
            </div>
          </div>

          {badges.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Achievements</h3>
              <div className="space-y-2">
                {badges.slice(0, 3).map((badge) => (
                  <div key={badge.id} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{badge.iconUrl}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-yellow-300 truncate">{badge.name}</div>
                        <div className="text-xs text-gray-400 truncate">{badge.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="bg-gray-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.name}</div>
                <div className="text-xs text-gray-400">Student</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content - Chat Interface */}
      <main className="flex-1 flex flex-col bg-white lg:ml-0">
        {/* Header */}
        <header className="border-b border-gray-200 px-4 lg:px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="ml-12 lg:ml-0">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-800">Math Practice Session</h2>
              <p className="text-xs lg:text-sm text-gray-500">AI-powered personalized learning</p>
            </div>
            {connected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
            )}
          </div>
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 lg:px-6 py-4 lg:py-8 space-y-4 lg:space-y-6">
          {/* Welcome Message */}
          {!currentProblem && !feedback && (
            <div className="max-w-3xl mx-auto text-center py-8 lg:py-12">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">Ready to practice?</h3>
              <p className="text-sm lg:text-base text-gray-600 mb-8 px-4">Click the button below to generate your next math problem</p>
            </div>
          )}

          {/* AI Problem Message */}
          {currentProblem && (
            <div className="flex gap-2 lg:gap-4 max-w-4xl">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl rounded-tl-none p-4 lg:p-6 shadow-sm border border-blue-100">
                  <div className="flex items-center gap-2 mb-2 lg:mb-3">
                    <span className="font-semibold text-sm lg:text-base text-gray-800">AI Tutor</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      currentProblem.difficultyLevel === 'EASY' ? 'bg-green-100 text-green-700' :
                      currentProblem.difficultyLevel === 'HARD' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {currentProblem.difficultyLevel}
                    </span>
                  </div>
                  <p className="text-gray-800 text-base lg:text-lg leading-relaxed">
                    {currentProblem.problemText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Previous Attempts History */}
          {attemptHistory.map((attempt, index) => (
            <div key={index}>
              {/* User Answer Message */}
              <div className="flex gap-2 lg:gap-4 max-w-4xl ml-auto justify-end mb-4 lg:mb-6">
                <div className="flex-1 flex justify-end min-w-0">
                  <div className="bg-gray-100 rounded-2xl rounded-tr-none p-4 lg:p-6 shadow-sm max-w-2xl">
                    <div className="font-semibold text-sm lg:text-base text-gray-800 mb-2">
                      Your Answer {attemptHistory.length > 1 ? `(Attempt ${index + 1})` : ''}
                    </div>
                    <p className="text-gray-800 text-base lg:text-lg">{attempt.answer}</p>
                  </div>
                </div>
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* AI Feedback Message */}
              <div className="flex gap-2 lg:gap-4 max-w-4xl mb-4 lg:mb-6">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                  {attempt.isCorrect ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`rounded-2xl rounded-tl-none p-4 lg:p-6 shadow-sm border-2 ${
                    attempt.isCorrect 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 lg:mb-3">
                      <span className="font-semibold text-sm lg:text-base text-gray-800">AI Tutor</span>
                      <span className={`text-xs lg:text-sm font-medium ${attempt.isCorrect ? 'text-green-600' : 'text-amber-600'}`}>
                        {attempt.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm lg:text-base leading-relaxed whitespace-pre-wrap">{attempt.feedback}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading State */}
          {loading && !feedback && (
            <div className="flex gap-2 lg:gap-4 max-w-4xl">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 lg:p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-gray-600 text-xs lg:text-sm">
                      {currentProblem ? 'Generating feedback...' : 'Generating problem...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 px-3 lg:px-6 py-3 lg:py-4 bg-white">
          <div className="max-w-4xl mx-auto">
            {!currentProblem ? (
              <button
                onClick={generateProblem}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating New Problem...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate New Problem
                  </span>
                )}
              </button>
            ) : feedback ? (
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                {/* Try Again Button - Only show for incorrect answers */}
                {!isCorrect && (
                  <button
                    onClick={() => {
                      setUserAnswer('')
                      setFeedback('') // Clear current feedback to show input
                      setIsCorrect(null)
                      setLoading(false)
                      setStartTime(Date.now())
                      // attemptHistory is preserved automatically
                    }}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-semibold py-3 lg:py-4 px-4 lg:px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm lg:text-base">Try Again</span>
                    </span>
                  </button>
                )}
                
                {/* New Problem Button */}
                <button
                  onClick={generateProblem}
                  disabled={loading}
                  className={`${!isCorrect ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-3 lg:py-4 px-4 lg:px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm lg:text-base">{isCorrect ? 'Next Problem' : 'New Problem'}</span>
                  </span>
                </button>
              </div>
            ) : (
              <form onSubmit={submitAnswer} className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                <input
                  type="number"
                  step="any"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="flex-1 px-4 lg:px-6 py-3 lg:py-4 text-base lg:text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                  placeholder="Type your answer..."
                  required
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!userAnswer || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 lg:px-8 py-3 lg:py-4 rounded-xl transition duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm lg:text-base">Checking...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm lg:text-base">Submit</span>
                      <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
