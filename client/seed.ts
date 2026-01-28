import { supabase } from './src/lib/supabase'

const sampleNodes = [
  {
    name: 'River Point North',
    latitude: 40.7128,
    longitude: -74.0060,
    threshold: 5.0,
  },
  {
    name: 'River Point Central',
    latitude: 40.7589,
    longitude: -73.9851,
    threshold: 4.5,
  },
  {
    name: 'River Point South',
    latitude: 40.6782,
    longitude: -73.9442,
    threshold: 6.0,
  },
  {
    name: 'River Point East',
    latitude: 40.7489,
    longitude: -73.9680,
    threshold: 5.5,
  },
  {
    name: 'River Point West',
    latitude: 40.7380,
    longitude: -74.0027,
    threshold: 4.8,
  },
]

const sampleReadings = [
  { node_id: 1, water_level: 2.5, flow_rate: 1.2 },
  { node_id: 1, water_level: 2.7, flow_rate: 1.3 },
  { node_id: 2, water_level: 3.8, flow_rate: 1.8 },
  { node_id: 2, water_level: 3.6, flow_rate: 1.7 },
  { node_id: 3, water_level: 5.2, flow_rate: 2.5 },
  { node_id: 3, water_level: 5.4, flow_rate: 2.7 },
  { node_id: 4, water_level: 2.1, flow_rate: 0.9 },
  { node_id: 5, water_level: 4.1, flow_rate: 2.1 },
]

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...')

  try {
    // Insert nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .insert(sampleNodes)
      .select()

    if (nodesError) {
      console.error('Error inserting nodes:', nodesError)
      return
    }

    console.log(`✅ Inserted ${nodes.length} nodes`)

    // Insert readings
    const { data: readings, error: readingsError } = await supabase
      .from('readings')
      .insert(sampleReadings)
      .select()

    if (readingsError) {
      console.error('Error inserting readings:', readingsError)
      return
    }

    console.log(`✅ Inserted ${readings.length} readings`)
    console.log('🎉 Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}

seedDatabase()
