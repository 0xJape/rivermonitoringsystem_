import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../config/supabase.js'

const router = Router()

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching nodes:', error)
    res.status(500).json({ error: 'Failed to fetch nodes' })
  }
})

// Get node by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('node_id', req.params.id)
      .single()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Node not found' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching node:', error)
    res.status(500).json({ error: 'Failed to fetch node' })
  }
})

// Create node
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('latitude').isFloat(),
    body('longitude').isFloat(),
    body('threshold').isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { name, latitude, longitude, threshold } = req.body

      const { data, error } = await supabase
        .from('nodes')
        .insert([{ name, latitude, longitude, threshold }])
        .select()
        .single()

      if (error) throw error
      res.status(201).json(data)
    } catch (error) {
      console.error('Error creating node:', error)
      res.status(500).json({ error: 'Failed to create node' })
    }
  }
)

// Update node
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().trim(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('threshold').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { name, latitude, longitude, threshold } = req.body

      const { data, error } = await supabase
        .from('nodes')
        .update({ name, latitude, longitude, threshold })
        .eq('node_id', req.params.id)
        .select()
        .single()

      if (error) throw error
      res.json(data)
    } catch (error) {
      console.error('Error updating node:', error)
      res.status(500).json({ error: 'Failed to update node' })
    }
  }
)

// Delete node
router.delete('/:id', async (req, res) => {
  try {
    // Delete associated readings first
    await supabase
      .from('readings')
      .delete()
      .eq('node_id', req.params.id)

    // Delete the node
    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('node_id', req.params.id)

    if (error) throw error
    res.json({ message: 'Node deleted successfully' })
  } catch (error) {
    console.error('Error deleting node:', error)
    res.status(500).json({ error: 'Failed to delete node' })
  }
})

// Get latest readings for all nodes
router.get('/readings/latest', async (req, res) => {
  try {
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')

    if (nodesError) throw nodesError

    const nodesWithReadings = await Promise.all(
      (nodes || []).map(async (node) => {
        const { data: readings } = await supabase
          .from('readings')
          .select('*')
          .eq('node_id', node.node_id)
          .order('timestamp', { ascending: false })
          .limit(1)

        return {
          ...node,
          latest_reading: readings?.[0] || null,
        }
      })
    )

    res.json(nodesWithReadings)
  } catch (error) {
    console.error('Error fetching nodes with readings:', error)
    res.status(500).json({ error: 'Failed to fetch nodes with readings' })
  }
})

export default router
