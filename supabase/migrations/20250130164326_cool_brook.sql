/*
  # Add rooms count to branches

  1. Changes
    - Add `rooms_count` column to `branches` table with default value of 10
    - Update existing branches with random room counts between 5 and 15
*/

-- Add rooms_count column to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS rooms_count integer NOT NULL DEFAULT 10;

-- Update existing branches with random room counts
UPDATE branches 
SET rooms_count = floor(random() * (15 - 5 + 1) + 5)::integer
WHERE rooms_count = 10;