import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nodesRouter from './routes/nodes.js'
import readingsRouter from './routes/readings.js'
import esp32Router from './routes/esp32.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/nodes', nodesRouter)
app.use('/api/readings', readingsRouter)
app.use('/api/esp32', esp32Router)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

const server = app.listen(PORT, async () => {
  console.log(`🌊 River Flow Tracking Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
  console.log(`ESP32 endpoint: http://localhost:${PORT}/api/esp32/reading`)
  console.log(`📊 Live data endpoint: http://localhost:${PORT}/api/esp32/live`)
  console.log(`💾 Data stored in live-data.json file`)
})

