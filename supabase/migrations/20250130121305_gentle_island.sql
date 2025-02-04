/*
  # Update RLS policies for public access

  1. Changes
    - Update RLS policies to allow public access for essential operations
    - Enable public access for customers table
    - Enable public access for queue entries table
    - Enable public access for bookings table
    - Keep settings table restricted to authenticated users only

  2. Security
    - Allow public access for customer creation and management
    - Allow public access for queue and booking operations
    - Maintain authentication requirement for settings
*/

-- Update customers table policies
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to update their customers" ON customers;

CREATE POLICY "Allow public access to customers"
  ON customers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update bookings table policies
DROP POLICY IF EXISTS "Allow authenticated users to read bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON bookings;

CREATE POLICY "Allow public access to bookings"
  ON bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update queue_entries table policies
DROP POLICY IF EXISTS "Allow authenticated users to read queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update queue entries" ON queue_entries;

CREATE POLICY "Allow public access to queue entries"
  ON queue_entries FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update branches table policies
DROP POLICY IF EXISTS "Allow authenticated users to read branches" ON branches;

CREATE POLICY "Allow public access to read branches"
  ON branches FOR SELECT
  USING (true);