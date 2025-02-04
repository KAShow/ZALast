/*
  # Add OTP verification

  1. New Tables
    - `otp_verifications`
      - `id` (uuid, primary key)
      - `phone` (text)
      - `code` (text)
      - `verified` (boolean)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `otp_verifications` table
    - Add policy for public access
*/

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to otp_verifications"
  ON otp_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_otp_verifications_updated_at
  BEFORE UPDATE ON otp_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();