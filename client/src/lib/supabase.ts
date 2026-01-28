import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

export interface NodeWithReading extends Node {
  latest_reading?: Reading
  status?: 'normal' | 'warning' | 'danger'
}
