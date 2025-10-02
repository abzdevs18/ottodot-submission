// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { Queue } from 'bullmq'
import { redisConnection } from './redis'

export interface GenerateProblemJobData {
  userId: string
  sessionId: string
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD'
}

export interface GenerateFeedbackJobData {
  userId: string
  sessionId: string
  submissionId: string
  problemText: string
  correctAnswer: number
  userAnswer: number
  isCorrect: boolean
}

// Create queues
export const problemQueue = new Queue<GenerateProblemJobData>('problem-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
    },
  },
})

export const feedbackQueue = new Queue<GenerateFeedbackJobData>('feedback-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
})

console.log('✅ BullMQ queues initialized')
