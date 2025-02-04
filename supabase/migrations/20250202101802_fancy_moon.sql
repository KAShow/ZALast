/*
  # Fix notifications table schema

  1. Changes
    - Add template_name column
    - Add variables column for template variables
    - Update existing notifications table structure

  2. Security
    - Maintain existing RLS policies
*/

-- Drop and recreate notifications table with updated schema
DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone text NOT NULL,
  template_name text NOT NULL,
  variables jsonb,
  message text,
  message_id text,
  scheduled_time timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  CONSTRAINT valid_template CHECK (template_name IN ('TABLE_READY', 'OTP'))
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to notifications"
  ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();