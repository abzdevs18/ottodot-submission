import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { problemQueue } from '@/lib/queue'
import type { Server as SocketIOServer } from 'socket.io'

export async function POST(request: NextRequest) {
  try {
    // Only students can generate problems
    const user = requireRole(request, ['STUDENT'])

    // Get user's current difficulty level
    let progress = await prisma.userProgress.findUnique({
      where: { userId: user.userId },
    })

    // If no progress record exists, create one
    if (!progress) {
      progress = await prisma.userProgress.create({
        data: {
          userId: user.userId,
          currentDifficulty: 'MEDIUM',
        },
      })
    }

    // Create a session record with pending status
    const session = await prisma.mathProblemSession.create({
      data: {
        userId: user.userId,
        problemText: 'Generating problem...', // Placeholder
        correctAnswer: 0, // Placeholder
        difficultyLevel: progress.currentDifficulty,
        jobStatus: 'pending',
      },
    })

    // Add job to queue
    const job = await problemQueue.add('generate-problem', {
      userId: user.userId,
      sessionId: session.id,
      difficultyLevel: progress.currentDifficulty,
    })

    // Update session with job ID
    await prisma.mathProblemSession.update({
      where: { id: session.id },
      data: { jobId: job.id },
    })

    // Notify teachers about student activity via Socket.IO
    const io = (global as any).io as SocketIOServer
    if (io) {
      io.to('teachers').emit('student:activity', {
        userId: user.userId,
        userName: user.name,
        action: 'generated_problem',
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      jobId: job.id,
      status: 'pending',
      message: 'Problem generation started. Please wait...',
    })
  } catch (error: any) {
    console.error('Generate problem error:', error)
    
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
