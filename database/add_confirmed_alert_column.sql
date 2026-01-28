-- Add confirmed_alert column to readings table
-- This tracks alerts that have been sustained for 5+ seconds
-- Run this in your Supabase SQL Editor

ALTER TABLE readings 
ADD COLUMN IF NOT EXISTS confirmed_alert BOOLEAN DEFAULT FALSE;

-- Add index for faster alert queries
CREATE INDEX IF NOT EXISTS idx_readings_confirmed_alert 
ON readings(node_id, confirmed_alert, timestamp DESC);

-- Update existing readings to have confirmed_alert = false
UPDATE readings 
SET confirmed_alert = false 
WHERE confirmed_alert IS NULL;
