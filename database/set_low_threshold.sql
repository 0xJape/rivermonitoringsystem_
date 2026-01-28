-- Set a low threshold for Purok 10 River to trigger alerts
-- This makes it easier to see alerts with your current 0.6m water level
-- Run this in your Supabase SQL Editor

-- For testing: Set threshold to 0.7m 
-- This means:
-- - Warning (70-90%): 0.49m - 0.63m
-- - Danger (>90%): above 0.63m
-- Your current 0.6m reading will show as WARNING

UPDATE nodes 
SET threshold = 0.7
WHERE name = 'Purok 10 River';

-- Verify the update
SELECT name, threshold FROM nodes WHERE name = 'Purok 10 River';

-- To see the alert status calculation:
SELECT 
  n.name,
  n.threshold,
  r.water_level,
  (r.water_level / n.threshold * 100) as percentage,
  CASE 
    WHEN r.water_level >= n.threshold * 0.9 THEN 'DANGER'
    WHEN r.water_level >= n.threshold * 0.7 THEN 'WARNING'
    ELSE 'NORMAL'
  END as status
FROM nodes n
LEFT JOIN readings r ON n.node_id = r.node_id
WHERE n.name = 'Purok 10 River'
ORDER BY r.timestamp DESC
LIMIT 1;
