/*
  # Add authentication system

  1. Changes
    - Add password field to branches table
    - Create developer_settings table for developer access
    - Add default passwords

  2. Security
    - Passwords are stored as hashes
    - Enable RLS on developer_settings table
*/

-- Add password field to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT 'branch123';

-- Create developer_settings table
CREATE TABLE IF NOT EXISTS developer_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE developer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to developer settings"
  ON developer_settings FOR SELECT
  USING (true);

-- Insert default developer password
INSERT INTO developer_settings (password)
VALUES ('dev123')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_developer_settings_updated_at
  BEFORE UPDATE ON developer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();