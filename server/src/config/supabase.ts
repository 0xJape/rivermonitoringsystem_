import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Node {
  node_id: number
  name: string
  latitude: number
  longitude: number
  threshold: number
  created_at: string
}

export interface Reading {
  reading_id: number
  node_id: number
  water_level: number
  flow_rate: number
  timestamp: string
}
