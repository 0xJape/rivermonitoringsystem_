import { createClient } from 'redis'
import type { WebSocket } from 'ws'

// Create separate client for subscriptions (Redis requirement)
const subscriber = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

subscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err))

// Store WebSocket connections for broadcasting
const wsConnections = new Set<WebSocket>()

export function registerWebSocket(ws: WebSocket) {
  wsConnections.add(ws)
  
  ws.on('close', () => {
    wsConnections.delete(ws)
  })
}

export async function startRedisSubscriber() {
  try {
    await subscriber.connect()
    console.log('✅ Redis Subscriber connected')
    
    // Subscribe to sensor readings channel
    await subscriber.subscribe('sensor:readings', (message) => {
      try {
        const reading = JSON.parse(message)
        
        // Broadcast to all connected WebSocket clients
        wsConnections.forEach(ws => {
          if (ws.readyState === 1) { // OPEN state
            ws.send(JSON.stringify({
              type: 'reading',
              data: reading
            }))
          }
        })
        
        console.log(`📊 Broadcasted reading from node ${reading.nodeId}`)
      } catch (error) {
        console.error('Error processing sensor reading:', error)
      }
    })
    
    // Subscribe to alerts channel
    await subscriber.subscribe('sensor:alerts', (message) => {
      try {
        const alert = JSON.parse(message)
        
        // Broadcast alert to all clients
        wsConnections.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'alert',
              data: alert
            }))
          }
        })
        
        console.log(`⚠️  Broadcasted alert from node ${alert.nodeId}`)
      } catch (error) {
        console.error('Error processing alert:', error)
      }
    })
    
    console.log('👂 Subscribed to Redis channels: sensor:readings, sensor:alerts')
    
  } catch (error) {
    console.error('❌ Failed to start Redis subscriber:', error)
    throw error
  }
}

export async function stopRedisSubscriber() {
  await subscriber.quit()
  console.log('⚠️  Redis Subscriber disconnected')
}
