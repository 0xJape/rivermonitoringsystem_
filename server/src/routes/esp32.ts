import express from 'express'
import { supabase } from '../config/supabase.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const router = express.Router()

// Path to live data JSON file
const LIVE_DATA_PATH = join(process.cwd(), 'live-data.json')

// Store the last database save time for each node
const lastDbSave: Record<string, number> = {}

// Store alert timers for 5-second confirmation
const alertTimers: Record<string, { startTime: number, status: string }> = {}

// Types
interface LiveReading {
  nodeId: string
  waterLevel: number
  timestamp: string
  alertStatus: string
  confirmedAlert: boolean
}

interface LiveData {
  [nodeId: string]: {
    current: LiveReading
    history: LiveReading[]
    lastUpdate: string
  }
}

// Helper functions for JSON file
function readLiveData(): LiveData {
  if (!existsSync(LIVE_DATA_PATH)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(LIVE_DATA_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeLiveData(data: LiveData) {
  writeFileSync(LIVE_DATA_PATH, JSON.stringify(data, null, 2))
}

// POST endpoint for ESP32 data
router.post('/reading', async (req, res) => {
  try {
    const reading = req.body as { nodeId: string; waterLevel: number }
    
    if (!reading.nodeId || reading.waterLevel === undefined) {
      return res.status(400).json({ error: 'Missing nodeId or waterLevel' })
    }

    const timestamp = new Date().toISOString()
    const now = Date.now()
    
    // Determine alert status
    let currentStatus = 'normal'
    if (reading.waterLevel >= 4.5) currentStatus = 'danger'
    else if (reading.waterLevel >= 3.5) currentStatus = 'warning'
    
    // Track alert confirmation (5 seconds)
    let confirmedAlert = false
    if (currentStatus !== 'normal') {
      if (!alertTimers[reading.nodeId] || alertTimers[reading.nodeId].status !== currentStatus) {
        alertTimers[reading.nodeId] = { startTime: now, status: currentStatus }
      }
      
      const alertDuration = now - alertTimers[reading.nodeId].startTime
      if (alertDuration >= 5000) {
        confirmedAlert = true
      }
    } else {
      delete alertTimers[reading.nodeId]
    }
    
    console.log(`📊 Live: ${reading.nodeId} ${reading.waterLevel}m [${currentStatus}]`)
    
    // Update live JSON file
    const liveData = readLiveData()
    const newReading: LiveReading = {
      nodeId: reading.nodeId,
      waterLevel: reading.waterLevel,
      timestamp,
      alertStatus: currentStatus,
      confirmedAlert
    }
    
    if (!liveData[reading.nodeId]) {
      liveData[reading.nodeId] = {
        current: newReading,
        history: [],
        lastUpdate: timestamp
      }
    }
    
    liveData[reading.nodeId].current = newReading
    liveData[reading.nodeId].history.unshift(newReading)
    liveData[reading.nodeId].lastUpdate = timestamp
    
    // Keep only last 600 readings per node (10 minutes at 1-second intervals)
    if (liveData[reading.nodeId].history.length > 600) {
      liveData[reading.nodeId].history = liveData[reading.nodeId].history.slice(0, 600)
    }
    
    writeLiveData(liveData)
    
    // Save to database every 30 seconds
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

// GET endpoint for live data
router.get('/live', (req, res) => {
  try {
    const liveData = readLiveData()
    res.json(liveData)
  } catch (error) {
    console.error('Error reading live data:', error)
    res.status(500).json({ error: 'Failed to read live data' })
  }
})

// Database persistence function
async function persistToDatabase(reading: { nodeId: string; waterLevel: number }, timestamp: string, confirmedAlert: boolean) {
  try {
    // Find or create node
    let { data: node } = await supabase
      .from('nodes')
      .select('*')
      .eq('name', reading.nodeId)
      .single()
    
    if (!node) {
      const { data: newNode, error: insertError } = await supabase
        .from('nodes')
        .insert({ 
          name: reading.nodeId,
          latitude: 0,
          longitude: 0
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Failed to create node:', insertError)
        throw insertError
      }
      node = newNode
    }
    
    // Clean up old readings (keep last 20 = 10 minutes at 30-second intervals)
    const { data: oldReadings } = await supabase
      .from('readings')
      .select('reading_id')
      .eq('node_id', node.node_id)
      .order('timestamp', { ascending: false })
      .range(20, 1000)
    
    if (oldReadings && oldReadings.length > 0) {
      const idsToDelete = oldReadings.map(r => r.reading_id)
      await supabase
        .from('readings')
        .delete()
        .in('reading_id', idsToDelete)
      console.log(`Cleaned up ${oldReadings.length} old readings`)
    }
    
    // Insert new reading
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
    
    console.log(`💾 Saved to database: ${reading.nodeId}`)
  } catch (error) {
    console.error('❌ Error persisting to database:', error)
    throw error
  }
}

export default router
