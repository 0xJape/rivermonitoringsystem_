import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

let wsClients: any[] = []
let lastDbSave: { [key: string]: number } = {}
let alertTimers: { [key: string]: { status: 'normal' | 'warning' | 'danger', startTime: number } } = {}

export function registerWebSocketClient(ws: any) {
  wsClients.push(ws)
  ws.on('close', () => {
    wsClients = wsClients.filter(client => client !== ws)
  })
}

function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message)
  wsClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(messageStr)
    }
  })
}

interface SensorReading {
  nodeId: string
  waterLevel: number
  timestamp?: string
}

router.get('/reading', (req, res) => {
  res.json({ 
    message: 'ESP32 endpoint is working!',
    info: 'Use POST to send sensor data',
    example: {
      nodeId: 'Purok 10 River',
      waterLevel: 2.5
    }
  })
})

router.post('/reading', async (req, res) => {
  try {
    const reading: SensorReading = req.body
    
    console.log('📊 Live:', reading.nodeId, reading.waterLevel + 'm')
    
    if (!reading.nodeId || reading.waterLevel === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: nodeId, waterLevel' 
      })
    }

    const timestamp = reading.timestamp || new Date().toISOString()
    
    // Determine current status
    const { data: node } = await supabase
      .from('nodes')
      .select('threshold')
      .eq('name', reading.nodeId)
      .single()
    
    let currentStatus: 'normal' | 'warning' | 'danger' = 'normal'
    if (node) {
      const percentage = (reading.waterLevel / node.threshold) * 100
      if (percentage >= 90) currentStatus = 'danger'
      else if (percentage >= 70) currentStatus = 'warning'
    }
    
    // Track alert duration
    const now = Date.now()
    const alertState = alertTimers[reading.nodeId]
    let confirmedAlert = false
    
    if (currentStatus === 'warning' || currentStatus === 'danger') {
      if (!alertState || alertState.status !== currentStatus) {
        // New alert or status changed - start timer
        alertTimers[reading.nodeId] = { status: currentStatus, startTime: now }
      } else {
        // Same alert status - check if 5 seconds passed
        const duration = now - alertState.startTime
        if (duration >= 5000) {
          confirmedAlert = true
        }
      }
    } else {
      // Normal status - clear timer
      delete alertTimers[reading.nodeId]
    }
    
    broadcastToClients({
      type: 'live_reading',
      data: {
        nodeId: reading.nodeId,
        waterLevel: reading.waterLevel,
        timestamp,
        status: currentStatus,
        confirmedAlert
      }
    })
    
    const lastSave = lastDbSave[reading.nodeId] || 0
    const timeSinceLastSave = now - lastSave
    
    if (timeSinceLastSave >= 30000) {
      lastDbSave[reading.nodeId] = now
      persistToDatabase(reading, timestamp, confirmedAlert).catch(err => 
        console.error('DB error:', err)
      )
    }
    
    res.json({ 
      status: 'success',
      message: 'Reading received',
      nodeId: reading.nodeId,
      timestamp,
      alertStatus: currentStatus,
      confirmedAlert
    })
    
  } catch (error) {
    console.error('Error processing ESP32 reading:', error)
    res.status(500).json({ error: 'Failed to process reading' })
  }
})

// Get live data from JSON file
router.get('/live', (req, res) => {
  try {
    const liveData = readLiveData()
    res.json(liveData)
  } catch (error) {
    console.error('Error reading live data:', error)
    res.status(500).json({ error: 'Failed to read live data' })
  }
})

router.get('/latest/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params
    
    const { data: node } = await supabase
      .from('nodes')
      .select('node_id')
      .eq('name', nodeId)
      .single()
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' })
    }
    
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('node_id', node.node_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      return res.status(404).json({ error: 'No recent data for this node' })
    }
    
    res.json(data)
  } catch (error) {
    console.error('Error fetching latest reading:', error)
    res.status(500).json({ error: 'Failed to fetch reading' })
  }
})

async function persistToDatabase(reading: SensorReading, timestamp: string, confirmedAlert: boolean) {
  let { data: node } = await supabase
    .from('nodes')
    .select('node_id')
    .eq('name', reading.nodeId)
    .single()
  
  if (!node) {
    console.log(`Creating new node: ${reading.nodeId}`)
    const { data: newNode, error: insertError } = await supabase
      .from('nodes')
      .insert({
        name: reading.nodeId,
        latitude: 6.327654,   // Purok 10 River location
        longitude: 124.953430, // Purok 10 River location
        threshold: 5.0
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Failed to create node:', insertError)
      throw insertError
    }
    node = newNode
  }
  
  const { data: oldReadings } = await supabase
    .from('readings')
    .select('reading_id')
    .eq('node_id', node.node_id)
    .order('timestamp', { ascending: false })
    .range(20, 1000) // Keep only 10 minutes of data (20 readings at 30-second intervals)
  
  if (oldReadings && oldReadings.length > 0) {
    const idsToDelete = oldReadings.map(r => r.reading_id)
    await supabase
      .from('readings')
      .delete()
      .in('reading_id', idsToDelete)
    console.log(`Cleaned up ${oldReadings.length} old readings`)
  }
  
  const { error } = await supabase
    .from('readings')
    .insert({
      node_id: node.node_id,
      water_level: reading.waterLevel,
      flow_rate: 0.0,
      timestamp: timestamp,
      confirmed_alert: confirmedAlert
    })
  
  if (error) {
    console.error('Database insert error:', error)
    throw error
  }
  
  if (confirmedAlert) {
    console.log(`⚠️ CONFIRMED ALERT: ${reading.nodeId} - ${reading.waterLevel}m`)
  }
}

export default router
