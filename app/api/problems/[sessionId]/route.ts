import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = requireAuth(request)
    const { sessionId } = params

    const session = await prisma.mathProblemSession.findUnique({
      where: { id: sessionId },
      include: {
        submissions: {
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this session
    if (session.userId !== user.userId && user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      session: {
        id: session.id,
        problemText: session.problemText,
        correctAnswer: user.role !== 'STUDENT' ? session.correctAnswer : undefined, // Hide answer from students
        difficultyLevel: session.difficultyLevel,
        jobStatus: session.jobStatus,
        createdAt: session.createdAt,
        submissions: session.submissions,
      },
    })
  } catch (error: any) {
    console.error('Get session error:', error)
    
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
