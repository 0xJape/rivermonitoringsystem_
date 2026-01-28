-- Add Tupi Central River node
-- Run this in your Supabase SQL Editor

-- Check if node exists and delete it first (if updating)
DELETE FROM nodes WHERE name = 'Tupi Central River';

-- Insert the new node
INSERT INTO nodes (name, latitude, longitude, threshold) 
VALUES ('Tupi Central River', 6.336852, 124.949397, 5.0);

-- Verify the nodes
SELECT * FROM nodes ORDER BY name;
