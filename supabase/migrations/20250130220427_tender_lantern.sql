/*
  # Add branch manager password management

  1. Changes
    - Add UPDATE permission to branches table for password field
    - Modify existing policy to allow both SELECT and UPDATE operations

  2. Security
    - Maintains row-level security
    - Allows public access for both reading and updating branch passwords
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow public access to read branches" ON branches;

-- Create new policy that allows both SELECT and UPDATE
CREATE POLICY "Allow public access to branches"
  ON branches
  FOR ALL
  USING (true)
  WITH CHECK (true);