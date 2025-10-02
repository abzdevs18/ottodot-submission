import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Only teachers and admins can access
    requireRole(request, ['TEACHER', 'ADMIN'])

    // Get overall statistics
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' },
    })

    const totalSessions = await prisma.mathProblemSession.count()
    const totalSubmissions = await prisma.mathProblemSubmission.count()

    const correctSubmissions = await prisma.mathProblemSubmission.count({
      where: { isCorrect: true },
    })

    const overallAccuracy = totalSubmissions > 0
      ? (correctSubmissions / totalSubmissions) * 100
      : 0

    // Get difficulty distribution
    const difficultyDistribution = await prisma.mathProblemSession.groupBy({
      by: ['difficultyLevel'],
      _count: {
        difficultyLevel: true,
      },
    })

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentSessions = await prisma.mathProblemSession.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    })

    const recentSubmissions = await prisma.mathProblemSubmission.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    })

    // Get top performers (by accuracy)
    const topPerformers = await prisma.userProgress.findMany({
      where: {
        totalProblems: {
          gte: 5, // At least 5 problems attempted
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          correctProblems: 'desc',
        },
      ],
      take: 5,
    })

    // Get average solve time
    const avgTime = await prisma.mathProblemSubmission.aggregate({
      _avg: {
        timeTaken: true,
      },
      where: {
        timeTaken: {
          not: null,
        },
      },
    })

    return NextResponse.json({
      overview: {
        totalStudents,
        totalSessions,
        totalSubmissions,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        avgSolveTime: avgTime._avg.timeTaken || 0,
      },
      recentActivity: {
        sessionsLast24h: recentSessions,
        submissionsLast24h: recentSubmissions,
      },
      difficultyDistribution: difficultyDistribution.map(d => ({
        level: d.difficultyLevel,
        count: d._count.difficultyLevel,
      })),
      topPerformers: topPerformers.map(p => ({
        userId: p.user.id,
        name: p.user.name,
        totalProblems: p.totalProblems,
        correctProblems: p.correctProblems,
        accuracy: (p.correctProblems / p.totalProblems) * 100,
        currentStreak: p.currentStreak,
      })),
    })
  } catch (error: any) {
    console.error('Get analytics error:', error)
    
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
