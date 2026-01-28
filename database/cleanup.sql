-- Clean up and rename node script
-- Run this in your Supabase SQL Editor

-- 1. Delete old readings (keep only last 50)
DELETE FROM readings 
WHERE reading_id NOT IN (
  SELECT reading_id 
  FROM readings 
  ORDER BY timestamp DESC 
  LIMIT 50
);

-- 2. Delete sample nodes (keep only node_id 1 or NODE_001)
DELETE FROM nodes 
WHERE name NOT LIKE '%NODE_001%' 
  AND name NOT LIKE '%Purok%'
  AND node_id > 1;

-- 3. Rename node 1 to "Purok 10 River"
UPDATE nodes 
SET name = 'Purok 10 River',
    latitude = 0.0,  -- Update with actual location if you have it
    longitude = 0.0,  -- Update with actual location if you have it
    threshold = 5.0
WHERE node_id = 1;

-- 4. Or if your node is named NODE_001, update it
UPDATE nodes 
SET name = 'Purok 10 River',
    latitude = 0.0,
    longitude = 0.0,
    threshold = 5.0
WHERE name = 'NODE_001';

-- 5. View the updated nodes
SELECT * FROM nodes;

-- 6. View remaining readings count
SELECT COUNT(*) as total_readings FROM readings;
