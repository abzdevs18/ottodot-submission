import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { feedbackQueue } from '@/lib/queue'
import type { Server as SocketIOServer } from 'socket.io'

export async function POST(request: NextRequest) {
  try {
    // Only students can submit answers
    const user = requireRole(request, ['STUDENT'])
    
    const body = await request.json()
    const { sessionId, userAnswer, timeTaken } = body

    if (!sessionId || userAnswer === undefined) {
      return NextResponse.json(
        { error: 'Session ID and answer are required' },
        { status: 400 }
      )
    }

    // Get the session
    const session = await prisma.mathProblemSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if session belongs to user
    if (session.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if session is completed
    if (session.jobStatus !== 'completed') {
      return NextResponse.json(
        { error: 'Problem is still being generated' },
        { status: 400 }
      )
    }

    // Check if answer is correct
    const isCorrect = Math.abs(parseFloat(userAnswer) - session.correctAnswer) < 0.01

    // Create submission with placeholder feedback
    const submission = await prisma.mathProblemSubmission.create({
      data: {
        sessionId: session.id,
        userId: user.userId,
        userAnswer: parseFloat(userAnswer),
        isCorrect,
        feedbackText: 'Generating feedback...', // Placeholder
        timeTaken: timeTaken || null,
      },
    })

    // Add feedback generation job to queue
    const job = await feedbackQueue.add('generate-feedback', {
      userId: user.userId,
      sessionId: session.id,
      submissionId: submission.id,
      problemText: session.problemText,
      correctAnswer: session.correctAnswer,
      userAnswer: parseFloat(userAnswer),
      isCorrect,
    })

    // Notify teachers about submission via Socket.IO
    const io = (global as any).io as SocketIOServer
    if (io) {
      io.to('teachers').emit('student:activity', {
        userId: user.userId,
        userName: user.name,
        action: 'submitted_answer',
        timestamp: new Date().toISOString(),
        isCorrect,
      })
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      isCorrect,
      correctAnswer: session.correctAnswer,
      jobId: job.id,
      status: 'pending',
      message: 'Answer submitted. Generating feedback...',
    })
  } catch (error: any) {
    console.error('Submit answer error:', error)
    
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
