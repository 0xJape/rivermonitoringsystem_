import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

let isRunning = true
let updateCount = 0

// Generate realistic water level change
function generateNextReading(currentLevel, threshold, trend) {
  // Small random fluctuation (-0.2 to +0.2 meters)
  const fluctuation = (Math.random() - 0.5) * 0.4
  
  // Trend influence (rising or falling water levels)
  const trendInfluence = trend * 0.05
  
  // Calculate new water level
  let newLevel = currentLevel + fluctuation + trendInfluence
  
  // Keep within realistic bounds (0.5m to 120% of threshold)
  newLevel = Math.max(0.5, Math.min(newLevel, threshold * 1.2))
  
  return parseFloat(newLevel.toFixed(2))
}

// Simulate live data updates
async function simulateLiveData() {
  try {
    // Fetch all nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
    
    if (nodesError) {
      console.error('❌ Error fetching nodes:', nodesError.message)
      return
    }
    
    if (!nodes || nodes.length === 0) {
      console.log('⚠️  No nodes found. Run seed.mjs first.')
      return
    }
    
    // For each node, get latest reading and generate new one
    for (const node of nodes) {
      const { data: latestReadings } = await supabase
        .from('readings')
        .select('*')
        .eq('node_id', node.node_id)
        .order('timestamp', { ascending: false })
        .limit(1)
      
      const latestReading = latestReadings?.[0]
      
      if (!latestReading) continue
      
      // Determine trend (randomly rising, falling, or stable)
      const trends = [-1, 0, 1] // falling, stable, rising
      const trend = trends[Math.floor(Math.random() * trends.length)]
      
      // Generate new water level
      const newWaterLevel = generateNextReading(
        latestReading.water_level,
        node.threshold,
        trend
      )
      
      // Flow rate correlates with water level
      const newFlowRate = parseFloat((newWaterLevel * (0.4 + Math.random() * 0.3)).toFixed(2))
      
      // Insert new reading
      const { error: insertError } = await supabase
        .from('readings')
        .insert({
          node_id: node.node_id,
          water_level: newWaterLevel,
          flow_rate: newFlowRate,
          timestamp: new Date().toISOString(),
        })
      
      if (insertError) {
        console.error(`❌ Error inserting reading for ${node.name}:`, insertError.message)
      } else {
        const percentage = ((newWaterLevel / node.threshold) * 100).toFixed(1)
        const status = percentage >= 90 ? '🔴' : percentage >= 70 ? '🟠' : '🟢'
        console.log(`${status} ${node.name}: ${newWaterLevel}m (${percentage}%) | Flow: ${newFlowRate} m³/s`)
      }
    }
    
    updateCount++
    console.log(`\n✓ Update #${updateCount} completed at ${new Date().toLocaleTimeString()}`)
    console.log('─'.repeat(70))
    
  } catch (error) {
    console.error('❌ Error in simulation:', error)
  }
}

// Cleanup old readings (keep last 50 per node)
async function cleanupOldReadings() {
  try {
    const { data: nodes } = await supabase.from('nodes').select('node_id')
    
    if (!nodes) return
    
    for (const node of nodes) {
      const { data: readings } = await supabase
        .from('readings')
        .select('reading_id')
        .eq('node_id', node.node_id)
        .order('timestamp', { ascending: false })
      
      if (readings && readings.length > 50) {
        const idsToKeep = readings.slice(0, 50).map(r => r.reading_id)
        
        await supabase
          .from('readings')
          .delete()
          .eq('node_id', node.node_id)
          .not('reading_id', 'in', `(${idsToKeep.join(',')})`)
      }
    }
    
    console.log('🧹 Cleaned up old readings')
  } catch (error) {
    console.error('⚠️  Cleanup error:', error.message)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Stopping live data simulator...')
  isRunning = false
  console.log(`✓ Generated ${updateCount} updates`)
  console.log('👋 Goodbye!')
  process.exit(0)
})

// Main loop
async function startSimulator() {
  console.log('🌊 TUPI RIVER LIVE DATA SIMULATOR')
  console.log('═'.repeat(70))
  console.log('📡 Simulating real-time water level monitoring')
  console.log('⏱️  Updates every 5 seconds')
  console.log('🛑 Press Ctrl+C to stop')
  console.log('═'.repeat(70))
  console.log('')
  
  // Initial update
  await simulateLiveData()
  
  // Update every 5 seconds
  const updateInterval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(updateInterval)
      clearInterval(cleanupInterval)
      return
    }
    await simulateLiveData()
  }, 5000)
  
  // Cleanup every 2 minutes
  const cleanupInterval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(cleanupInterval)
      return
    }
    await cleanupOldReadings()
  }, 120000)
}

startSimulator()
