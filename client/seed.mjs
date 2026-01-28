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
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleNodes = [
  {
    name: 'Tupi River - Crossing Bridge',
    latitude: 6.3380,
    longitude: 124.9520,
    threshold: 5.0,
  },
  {
    name: 'Tupi River - Town Center',
    latitude: 6.3333,
    longitude: 124.9480,
    threshold: 4.5,
  },
  {
    name: 'Tupi River - Agricultural Zone',
    latitude: 6.3250,
    longitude: 124.9550,
    threshold: 6.0,
  },
  {
    name: 'Tupi River - Upstream Station',
    latitude: 6.3450,
    longitude: 124.9400,
    threshold: 5.5,
  },
  {
    name: 'Tupi River - Downstream Exit',
    latitude: 6.3180,
    longitude: 124.9600,
    threshold: 4.8,
  },
]

// Generate random readings for a node
function generateRandomReadings(nodeId, threshold, count = 15) {
  const readings = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    // Spread readings over the past 24 hours
    const timestamp = new Date(now.getTime() - i * (24 * 60 * 60 * 1000 / count))
    
    // Generate varied water levels
    const rand = Math.random()
    let waterLevel
    if (rand < 0.5) {
      // 50% normal (30-65% of threshold)
      waterLevel = threshold * (0.3 + Math.random() * 0.35)
    } else if (rand < 0.8) {
      // 30% warning (65-85% of threshold)
      waterLevel = threshold * (0.65 + Math.random() * 0.2)
    } else {
      // 20% danger (85-110% of threshold)
      waterLevel = threshold * (0.85 + Math.random() * 0.25)
    }
    
    // Flow rate correlates with water level
    const flowRate = waterLevel * (0.4 + Math.random() * 0.3)
    
    readings.push({
      node_id: nodeId,
      water_level: parseFloat(waterLevel.toFixed(2)),
      flow_rate: parseFloat(flowRate.toFixed(2)),
      timestamp: timestamp.toISOString(),
    })
  }
  
  return readings
}

async function seedDatabase() {
  console.log('🌱 Seeding database with fresh Tupi River data...\n')

  try {
    // Step 1: Clear existing readings
    console.log('🗑️  Clearing existing readings...')
    const { error: deleteReadingsError } = await supabase
      .from('readings')
      .delete()
      .neq('reading_id', 0) // Delete all
    
    if (deleteReadingsError) {
      console.log('   Note: Could not clear readings:', deleteReadingsError.message)
    } else {
      console.log('   ✓ Readings cleared')
    }

    // Step 2: Clear existing nodes
    console.log('🗑️  Clearing existing nodes...')
    const { error: deleteNodesError } = await supabase
      .from('nodes')
      .delete()
      .neq('node_id', 0) // Delete all
    
    if (deleteNodesError) {
      console.log('   Note: Could not clear nodes:', deleteNodesError.message)
    } else {
      console.log('   ✓ Nodes cleared')
    }

    // Step 3: Insert fresh nodes
    console.log('\n📍 Inserting Tupi River monitoring nodes...')
    const { data: insertedNodes, error: nodesError } = await supabase
      .from('nodes')
      .insert(sampleNodes)
      .select()

    if (nodesError) {
      console.error('❌ Error inserting nodes:', nodesError.message)
      return
    }

    console.log(`   ✓ Inserted ${insertedNodes.length} nodes:`)
    insertedNodes.forEach(node => {
      console.log(`     - ${node.name} (ID: ${node.node_id}, Threshold: ${node.threshold}m)`)
    })

    // Step 4: Generate and insert readings for each node
    console.log('\n📊 Generating random water level readings...')
    
    const allReadings = []
    for (const node of insertedNodes) {
      const readings = generateRandomReadings(node.node_id, node.threshold, 15)
      allReadings.push(...readings)
    }

    const { data: insertedReadings, error: readingsError } = await supabase
      .from('readings')
      .insert(allReadings)
      .select()

    if (readingsError) {
      console.error('❌ Error inserting readings:', readingsError.message)
      return
    }

    console.log(`   ✓ Inserted ${insertedReadings.length} readings`)
    
    // Show summary
    console.log('\n📈 Data Summary:')
    for (const node of insertedNodes) {
      const nodeReadings = insertedReadings.filter(r => r.node_id === node.node_id)
      const latestReading = nodeReadings.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
      
      const percentage = ((latestReading.water_level / node.threshold) * 100).toFixed(1)
      const status = percentage >= 90 ? '🔴 DANGER' : percentage >= 70 ? '🟠 WARNING' : '🟢 NORMAL'
      
      console.log(`   ${node.name}:`)
      console.log(`     Latest: ${latestReading.water_level}m / ${node.threshold}m (${percentage}%) ${status}`)
    }

    console.log('\n🎉 Database seeded successfully!')
    console.log('   Refresh your browser to see the updated data.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

seedDatabase()
