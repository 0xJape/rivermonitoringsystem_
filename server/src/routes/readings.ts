import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../config/supabase.js'

const router = Router()

// Get all readings for a node
router.get('/node/:nodeId', async (req, res) => {
  try {
    const { limit = 100 } = req.query
    
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('node_id', req.params.nodeId)
      .order('timestamp', { ascending: false })
      .limit(Number(limit))

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching readings:', error)
    res.status(500).json({ error: 'Failed to fetch readings' })
  }
})

// Get latest reading for a node
router.get('/node/:nodeId/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('node_id', req.params.nodeId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching latest reading:', error)
    res.status(500).json({ error: 'Failed to fetch latest reading' })
  }
})

// Get all readings (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query
    
    let query = supabase
      .from('readings')
      .select('*, nodes(name)')
      .order('timestamp', { ascending: false })
      .limit(Number(limit))

    if (startDate) {
      query = query.gte('timestamp', startDate as string)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate as string)
    }

    const { data, error } = await query

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching readings:', error)
    res.status(500).json({ error: 'Failed to fetch readings' })
  }
})

// Create reading (for IoT sensors)
router.post(
  '/',
  [
    body('node_id').isInt({ min: 1 }),
    body('water_level').isFloat({ min: 0 }),
    body('flow_rate').isFloat({ min: 0 }),
    body('timestamp').optional().isISO8601(),
  ],
  async (req: any, res: any): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { node_id, water_level, flow_rate, timestamp } = req.body

      // Verify node exists
      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('node_id, threshold')
        .eq('node_id', node_id)
        .single()

      if (nodeError || !node) {
        return res.status(404).json({ error: 'Node not found' })
      }

      // Insert reading
      const { data, error } = await supabase
        .from('readings')
        .insert([
          {
            node_id,
            water_level,
            flow_rate,
            timestamp: timestamp || new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Check if alert threshold exceeded
      const alertStatus = water_level >= node.threshold * 0.9
        ? water_level >= node.threshold
          ? 'danger'
          : 'warning'
        : 'normal'

      res.status(201).json({
        ...data,
        alert_status: alertStatus,
      })
    } catch (error) {
      console.error('Error creating reading:', error)
      res.status(500).json({ error: 'Failed to create reading' })
    }
  }
)

// Delete reading
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('readings')
      .delete()
      .eq('reading_id', req.params.id)

    if (error) throw error
    res.json({ message: 'Reading deleted successfully' })
  } catch (error) {
    console.error('Error deleting reading:', error)
    res.status(500).json({ error: 'Failed to delete reading' })
  }
})

// Get statistics for a time period
router.get('/stats/:nodeId', async (req, res): Promise<void> => {
  try {
    const { startDate, endDate } = req.query
    
    let query = supabase
      .from('readings')
      .select('water_level, flow_rate')
      .eq('node_id', req.params.nodeId)

    if (startDate) {
      query = query.gte('timestamp', startDate as string)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate as string)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      res.json({ message: 'No data available' })
      return
    }

    const stats = {
      count: data.length,
      water_level: {
        avg: data.reduce((sum, r) => sum + r.water_level, 0) / data.length,
        min: Math.min(...data.map((r) => r.water_level)),
        max: Math.max(...data.map((r) => r.water_level)),
      },
      flow_rate: {
        avg: data.reduce((sum, r) => sum + r.flow_rate, 0) / data.length,
        min: Math.min(...data.map((r) => r.flow_rate)),
        max: Math.max(...data.map((r) => r.flow_rate)),
      },
    }

    res.json(stats)
  } catch (error) {
    console.error('Error calculating statistics:', error)
    res.status(500).json({ error: 'Failed to calculate statistics' })
  }
})

export default router
