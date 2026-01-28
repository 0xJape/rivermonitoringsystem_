import { createClient } from 'redis'

// Create Redis client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many retry attempts')
        return new Error('Too many retries')
      }
      return retries * 100 // Exponential backoff
    }
  }
})

// Redis connection events
redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err))
redisClient.on('connect', () => console.log('🔄 Redis: Connecting...'))
redisClient.on('ready', () => console.log('✅ Redis: Connected and ready'))
redisClient.on('reconnecting', () => console.log('🔄 Redis: Reconnecting...'))
redisClient.on('end', () => console.log('⚠️  Redis: Connection closed'))

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect()
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error)
    throw error
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit()
  process.exit(0)
})

// Helper functions for sensor data
export const RedisKeys = {
  // Store latest reading from each sensor node
  latestReading: (nodeId: string) => `node:${nodeId}:latest`,
  
  // Store recent readings as a time-series list (last N readings)
  recentReadings: (nodeId: string) => `node:${nodeId}:recent`,
  
  // Alert queue for processing
  alertQueue: () => 'alerts:queue',
  
  // Node status tracking
  nodeStatus: (nodeId: string) => `node:${nodeId}:status`,
  
  // Aggregated data (e.g., hourly averages)
  aggregated: (nodeId: string, interval: string) => `node:${nodeId}:agg:${interval}`
}
