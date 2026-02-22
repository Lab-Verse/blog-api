-- Migration: Drop avatar column from user_profiles table
-- Date: 2024

-- Drop avatar column
ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;
