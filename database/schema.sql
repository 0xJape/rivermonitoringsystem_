-- River Flow Tracking System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create nodes table
CREATE TABLE IF NOT EXISTS nodes (
  node_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create readings table
CREATE TABLE IF NOT EXISTS readings (
  reading_id SERIAL PRIMARY KEY,
  node_id INTEGER NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  water_level DOUBLE PRECISION NOT NULL,
  flow_rate DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_readings_node_id ON readings(node_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_node_timestamp ON readings(node_id, timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Enable read access for all users" ON nodes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON nodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON nodes
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON nodes
  FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON readings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON readings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON readings
  FOR DELETE USING (true);

-- Insert sample data (optional)
INSERT INTO nodes (name, latitude, longitude, threshold) VALUES
  ('River Point North', 40.7128, -74.0060, 5.0),
  ('River Point Central', 40.7589, -73.9851, 4.5),
  ('River Point South', 40.6782, -73.9442, 6.0);

-- Insert sample readings (optional)
INSERT INTO readings (node_id, water_level, flow_rate, timestamp) VALUES
  (1, 2.5, 1.2, NOW() - INTERVAL '5 minutes'),
  (1, 2.7, 1.3, NOW() - INTERVAL '10 minutes'),
  (1, 2.4, 1.1, NOW() - INTERVAL '15 minutes'),
  (2, 3.1, 1.8, NOW() - INTERVAL '5 minutes'),
  (2, 3.0, 1.7, NOW() - INTERVAL '10 minutes'),
  (3, 4.2, 2.5, NOW() - INTERVAL '5 minutes'),
  (3, 4.5, 2.7, NOW() - INTERVAL '10 minutes');

-- Create a function to automatically delete old readings (optional)
CREATE OR REPLACE FUNCTION delete_old_readings()
RETURNS void AS $$
BEGIN
  DELETE FROM readings WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up a periodic cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-readings', '0 2 * * *', 'SELECT delete_old_readings()');
