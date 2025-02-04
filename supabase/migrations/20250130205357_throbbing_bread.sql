/*
  # Add wait time settings to branches

  1. Changes
    - Add `expected_wait_time` column to branches table
    - Set default value of 15 minutes
    - Update existing branches with random wait times

  2. Notes
    - This helps control the expected wait time between bookings for each branch
*/

-- Add expected_wait_time column to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS expected_wait_time integer NOT NULL DEFAULT 15;

-- Update existing branches with random wait times between 10 and 30 minutes
UPDATE branches 
SET expected_wait_time = floor(random() * (30 - 10 + 1) + 10)::integer
WHERE expected_wait_time = 15;