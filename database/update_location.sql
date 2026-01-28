-- Update Purok 10 River location
-- Run this in your Supabase SQL Editor

UPDATE nodes 
SET latitude = 6.327654,
    longitude = 124.953430
WHERE name = 'Purok 10 River';

-- Verify the update
SELECT * FROM nodes WHERE name = 'Purok 10 River';
