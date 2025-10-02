// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { Worker, Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { redisConnection } from './redis'
import { prisma } from './prisma'
import type { GenerateProblemJobData, GenerateFeedbackJobData } from './queue'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
})

// Worker for problem generation
const problemWorker = new Worker<GenerateProblemJobData>(
  'problem-generation',
  async (job: Job<GenerateProblemJobData>) => {
    console.log(`🔄 Processing problem generation job ${job.id}`)
    
    const { userId, sessionId, difficultyLevel } = job.data

    try {
      // Update job status to processing
      await prisma.mathProblemSession.update({
        where: { id: sessionId },
        data: { jobStatus: 'processing' },
      })

      // Generate problem using AI
      const difficultyInstruction = {
        EASY: 'simple addition or subtraction with numbers under 50',
        MEDIUM: 'multiplication, division, or multi-step problems with numbers under 100',
        HARD: 'complex multi-step word problems with fractions, decimals, or larger numbers',
      }

      const prompt = `Generate a math word problem suitable for a Primary 5 student (age 10-11).
Difficulty level: ${difficultyLevel} - ${difficultyInstruction[difficultyLevel]}.

Requirements:
1. The problem should be engaging and relatable to 10-11 year olds
2. Include real-world scenarios (shopping, sports, cooking, etc.)
3. The problem should require logical thinking and calculation
4. Provide ONLY a JSON response with this exact format:
{
  "problem_text": "A detailed word problem here...",
  "final_answer": [numeric answer]
}

Do not include any other text or explanation outside the JSON.`

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ],
      })
      
      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response')
      }
      
      const problemData = JSON.parse(jsonMatch[0])

      // Update session with generated problem
      await prisma.mathProblemSession.update({
        where: { id: sessionId },
        data: {
          problemText: problemData.problem_text,
          correctAnswer: parseFloat(problemData.final_answer),
          jobStatus: 'completed',
        },
      })

      console.log(`✅ Problem generation job ${job.id} completed`)
      
      return { success: true, sessionId }
    } catch (error) {
      console.error(`❌ Problem generation job ${job.id} failed:`, error)
      
      await prisma.mathProblemSession.update({
        where: { id: sessionId },
        data: { jobStatus: 'failed' },
      })
      
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Reduced from 5 to 2 to save Redis connections
  }
)

// Worker for feedback generation
const feedbackWorker = new Worker<GenerateFeedbackJobData>(
  'feedback-generation',
  async (job: Job<GenerateFeedbackJobData>) => {
    console.log(`🔄 Processing feedback generation job ${job.id}`)
    
    const { userId, sessionId, submissionId, problemText, correctAnswer, userAnswer, isCorrect } = job.data

    try {
      const prompt = `You are a supportive math teacher for Primary 5 students (age 10-11).

Problem: ${problemText}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}

Generate personalized, encouraging feedback for the student. 

If correct:
- Celebrate their success
- Briefly explain why the answer is correct
- Encourage them to try more problems

If incorrect:
- Be kind and supportive
- Explain what went wrong in simple terms
- Give a hint on how to approach it correctly
- Encourage them to try again

Keep the feedback concise (2-3 sentences) and age-appropriate.`

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [
          { role: 'user', content: prompt }
        ],
      })
      
      const feedback = message.content[0].type === 'text' ? message.content[0].text : 'Great effort!'

      // Update submission with feedback
      await prisma.mathProblemSubmission.update({
        where: { id: submissionId },
        data: { feedbackText: feedback },
      })

      // Update user progress
      await updateUserProgress(userId, isCorrect)

      // Check and award badges
      await checkAndAwardBadges(userId)

      console.log(`✅ Feedback generation job ${job.id} completed`)
      console.log(`📊 User ${userId} - Correct: ${isCorrect} - Feedback length: ${feedback.length} chars`)
      
      return { success: true, submissionId }
    } catch (error) {
      console.error(`❌ Feedback generation job ${job.id} failed:`, error)
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Reduced from 5 to 2 to save Redis connections
  }
)

// Helper function to update user progress
async function updateUserProgress(userId: string, isCorrect: boolean) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  })

  if (!progress) {
    // Create initial progress record
    await prisma.userProgress.create({
      data: {
        userId,
        totalProblems: 1,
        correctProblems: isCorrect ? 1 : 0,
        currentStreak: isCorrect ? 1 : 0,
        longestStreak: isCorrect ? 1 : 0,
        lastFiveResults: [isCorrect ? 'correct' : 'incorrect'],
        currentDifficulty: 'MEDIUM',
      },
    })
    return
  }

  // Update existing progress
  const newStreak = isCorrect ? progress.currentStreak + 1 : 0
  const newLongestStreak = Math.max(newStreak, progress.longestStreak)
  
  // Keep only last 5 results
  const lastFive = [...progress.lastFiveResults, isCorrect ? 'correct' : 'incorrect'].slice(-5)
  
  // Calculate adaptive difficulty
  const correctCount = lastFive.filter(r => r === 'correct').length
  let newDifficulty = progress.currentDifficulty
  
  if (lastFive.length === 5) {
    if (correctCount >= 4) {
      // 80%+ correct -> increase difficulty
      newDifficulty = progress.currentDifficulty === 'EASY' ? 'MEDIUM' : 
                      progress.currentDifficulty === 'MEDIUM' ? 'HARD' : 'HARD'
    } else if (correctCount <= 2) {
      // 40% or less -> decrease difficulty
      newDifficulty = progress.currentDifficulty === 'HARD' ? 'MEDIUM' : 
                      progress.currentDifficulty === 'MEDIUM' ? 'EASY' : 'EASY'
    }
  }

  await prisma.userProgress.update({
    where: { userId },
    data: {
      totalProblems: progress.totalProblems + 1,
      correctProblems: progress.correctProblems + (isCorrect ? 1 : 0),
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastFiveResults: lastFive,
      currentDifficulty: newDifficulty,
    },
  })
}

// Helper function to check and award badges
async function checkAndAwardBadges(userId: string) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  })

  if (!progress) return

  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
  })

  const earnedBadgeTypes = existingBadges.map(ub => ub.badge.badgeType)

  // Check for Streak Master (5 correct in a row)
  if (progress.currentStreak >= 5 && !earnedBadgeTypes.includes('STREAK_MASTER')) {
    const badge = await prisma.badge.findFirst({
      where: { badgeType: 'STREAK_MASTER' },
    })
    if (badge) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      })
    }
  }

  // Check for Persistence (10 problems total)
  if (progress.totalProblems >= 10 && !earnedBadgeTypes.includes('PERSISTENCE')) {
    const badge = await prisma.badge.findFirst({
      where: { badgeType: 'PERSISTENCE' },
    })
    if (badge) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      })
    }
  }

  // Check for Math Genius (50 problems total)
  if (progress.totalProblems >= 50 && !earnedBadgeTypes.includes('MATH_GENIUS')) {
    const badge = await prisma.badge.findFirst({
      where: { badgeType: 'MATH_GENIUS' },
    })
    if (badge) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      })
    }
  }
}

// Event listeners for monitoring
problemWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`)
})

problemWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

feedbackWorker.on('completed', (job) => {
  console.log(`✅ Feedback job ${job.id} completed successfully`)
})

feedbackWorker.on('failed', (job, err) => {
  console.error(`❌ Feedback job ${job?.id} failed:`, err.message)
})

console.log('🚀 Workers started and listening for jobs...')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down workers...')
  await problemWorker.close()
  await feedbackWorker.close()
  await prisma.$disconnect()
  process.exit(0)
})
