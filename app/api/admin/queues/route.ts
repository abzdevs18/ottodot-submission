import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { problemQueue, feedbackQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    // Only admins can access
    requireRole(request, ['ADMIN'])

    // Get problem queue stats
    const problemQueueCounts = await problemQueue.getJobCounts()
    
    // Get feedback queue stats
    const feedbackQueueCounts = await feedbackQueue.getJobCounts()

    return NextResponse.json({
      queues: [
        {
          name: 'Problem Generation',
          queueName: 'problem-generation',
          waiting: problemQueueCounts.waiting || 0,
          active: problemQueueCounts.active || 0,
          completed: problemQueueCounts.completed || 0,
          failed: problemQueueCounts.failed || 0,
          delayed: problemQueueCounts.delayed || 0,
        },
        {
          name: 'Feedback Generation',
          queueName: 'feedback-generation',
          waiting: feedbackQueueCounts.waiting || 0,
          active: feedbackQueueCounts.active || 0,
          completed: feedbackQueueCounts.completed || 0,
          failed: feedbackQueueCounts.failed || 0,
          delayed: feedbackQueueCounts.delayed || 0,
        },
      ],
    })
  } catch (error: any) {
    console.error('Get queues error:', error)
    
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
