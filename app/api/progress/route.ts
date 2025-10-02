import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)

    // Get user progress
    const progress = await prisma.userProgress.findUnique({
      where: { userId: user.userId },
    })

    // Get user badges
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: user.userId },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    })

    // Get recent sessions
    const recentSessions = await prisma.mathProblemSession.findMany({
      where: { userId: user.userId },
      include: {
        submissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    return NextResponse.json({
      progress: progress || {
        totalProblems: 0,
        correctProblems: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeTaken: 0,
        currentDifficulty: 'MEDIUM',
      },
      badges: userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        earnedAt: ub.earnedAt,
      })),
      recentSessions: recentSessions.map(session => ({
        id: session.id,
        problemText: session.problemText,
        difficultyLevel: session.difficultyLevel,
        createdAt: session.createdAt,
        submissionCount: session.submissions.length,
        isCompleted: session.submissions.some(s => s.isCorrect),
      })),
    })
  } catch (error: any) {
    console.error('Get progress error:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
