// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import Redis from 'ioredis'

const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = parseInt(process.env.REDIS_PORT || '6379')
const redisPassword = process.env.REDIS_PASSWORD || undefined

console.log('🔧 Redis Configuration:', {
  host: redisHost,
  port: redisPort,
  hasPassword: !!redisPassword
})

// Connection for BullMQ - don't create actual connection, just config
export const redisConnection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  // Limit connections to prevent hitting Redis Cloud's free tier limit
  lazyConnect: true,
}

// Singleton Redis client
let redisClient: Redis | null = null

export const getRedis = () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      // Prevent too many connections
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 3) return null // Stop retrying after 3 attempts
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully')
    })

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err)
    })
  }
  return redisClient
}

// Export singleton instance
export const redis = getRedis()
