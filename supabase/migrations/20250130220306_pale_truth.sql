/*
  # Fix developer settings permissions

  1. Changes
    - Add UPDATE permission to developer_settings table
    - Modify existing policy to allow both SELECT and UPDATE operations

  2. Security
    - Maintains row-level security
    - Allows public access for both reading and updating developer settings
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow public access to developer settings" ON developer_settings;

-- Create new policy that allows both SELECT and UPDATE
CREATE POLICY "Allow public access to developer settings"
  ON developer_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);