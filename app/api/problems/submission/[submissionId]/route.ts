import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const user = requireAuth(request)
    const { submissionId } = params

    const submission = await prisma.mathProblemSubmission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Verify the submission belongs to the user
    if (submission.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        userAnswer: submission.userAnswer,
        isCorrect: submission.isCorrect,
        feedbackText: submission.feedbackText,
        timeTaken: submission.timeTaken,
        createdAt: submission.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Get submission error:', error)
    
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
