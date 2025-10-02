import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Only teachers and admins can access
    requireRole(request, ['TEACHER', 'ADMIN'])

    // Get all students with their progress
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        progressRecords: true,
        sessions: {
          include: {
            submissions: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Last 5 sessions per student
        },
        userBadges: {
          include: {
            badge: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      students: students.map(student => {
        const progress = student.progressRecords[0]
        return {
          id: student.id,
          name: student.name,
          email: student.email,
          createdAt: student.createdAt,
          progress: progress ? {
            totalProblems: progress.totalProblems,
            correctProblems: progress.correctProblems,
            accuracy: progress.totalProblems > 0
              ? (progress.correctProblems / progress.totalProblems) * 100
              : 0,
            currentStreak: progress.currentStreak,
            currentDifficulty: progress.currentDifficulty,
          } : null,
          recentSessions: student.sessions,
          badges: student.userBadges.map(ub => ({
            name: ub.badge.name,
            iconUrl: ub.badge.iconUrl,
            earnedAt: ub.earnedAt,
          })),
        }
      }),
    })
  } catch (error: any) {
    console.error('Get students error:', error)
    
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
