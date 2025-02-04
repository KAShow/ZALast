/*
  # Add branches and test data

  1. New Tables
    - `branches`
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `branch_id` to bookings and queue_entries tables
    - Add foreign key constraints

  3. Test Data
    - Insert 20 branches
    - Insert 100 customers with realistic Saudi names
    - Create sample bookings and queue entries
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- Add branch_id to bookings and queue_entries
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- Add trigger for updated_at
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert 20 branches
INSERT INTO branches (name, address, phone) VALUES
  ('زاد السلطان - الرياض العليا', 'شارع العليا العام، حي العليا، الرياض', '0114567890'),
  ('زاد السلطان - الرياض غرناطة', 'شارع أبي بكر الصديق، حي غرناطة، الرياض', '0114567891'),
  ('زاد السلطان - الرياض النخيل', 'طريق الملك عبدالعزيز، حي النخيل، الرياض', '0114567892'),
  ('زاد السلطان - جدة الروضة', 'شارع صاري، حي الروضة، جدة', '0126789012'),
  ('زاد السلطان - جدة الشاطئ', 'شارع الأمير محمد بن عبدالعزيز، حي الشاطئ، جدة', '0126789013'),
  ('زاد السلطان - جدة السلامة', 'شارع الأمير سلطان، حي السلامة، جدة', '0126789014'),
  ('زاد السلطان - الدمام الشاطئ', 'شارع الخليج، حي الشاطئ، الدمام', '0138901234'),
  ('زاد السلطان - الدمام العزيزية', 'طريق الملك فهد، حي العزيزية، الدمام', '0138901235'),
  ('زاد السلطان - مكة العزيزية', 'شارع العزيزية العام، حي العزيزية، مكة المكرمة', '0125678901'),
  ('زاد السلطان - مكة النسيم', 'طريق الحج، حي النسيم، مكة المكرمة', '0125678902'),
  ('زاد السلطان - المدينة قباء', 'شارع قباء، المدينة المنورة', '0148901234'),
  ('زاد السلطان - المدينة العنابية', 'شارع السلام، حي العنابية، المدينة المنورة', '0148901235'),
  ('زاد السلطان - الطائف الشفا', 'طريق الشفا، الطائف', '0127890123'),
  ('زاد السلطان - الطائف السلامة', 'شارع السلامة، الطائف', '0127890124'),
  ('زاد السلطان - تبوك المروج', 'حي المروج، تبوك', '0144567890'),
  ('زاد السلطان - تبوك السلام', 'حي السلام، تبوك', '0144567891'),
  ('زاد السلطان - الخبر اليرموك', 'حي اليرموك، الخبر', '0138765432'),
  ('زاد السلطان - الخبر العقربية', 'حي العقربية، الخبر', '0138765433'),
  ('زاد السلطان - أبها السد', 'حي السد، أبها', '0172345678'),
  ('زاد السلطان - أبها الخالدية', 'حي الخالدية، أبها', '0172345679');

-- Insert 100 customers with realistic Saudi names
DO $$
DECLARE
  first_names text[] := ARRAY[
    'محمد', 'أحمد', 'عبدالله', 'عبدالرحمن', 'عبدالعزيز', 'سعد', 'فهد', 'خالد', 'سلطان', 'نايف',
    'بندر', 'سعود', 'فيصل', 'تركي', 'ماجد', 'عمر', 'علي', 'حسن', 'حسين', 'يوسف',
    'نورة', 'سارة', 'منيرة', 'لطيفة', 'عائشة', 'فاطمة', 'مريم', 'هيا', 'الجوهرة', 'العنود'
  ];
  last_names text[] := ARRAY[
    'السعيد', 'العتيبي', 'القحطاني', 'الغامدي', 'الزهراني', 'الشهري', 'الدوسري', 'المطيري', 'الحربي', 'السبيعي',
    'الرشيدي', 'البقمي', 'الشمري', 'العنزي', 'المالكي', 'الشهراني', 'الحازمي', 'الغنام', 'السلمي', 'الحميد'
  ];
  i integer;
  first_name text;
  last_name text;
  phone text;
BEGIN
  FOR i IN 1..100 LOOP
    first_name := first_names[1 + floor(random() * array_length(first_names, 1))];
    last_name := last_names[1 + floor(random() * array_length(last_names, 1))];
    phone := '05' || floor(random() * (99999999 - 10000000 + 1) + 10000000)::text;
    
    INSERT INTO customers (name, phone)
    VALUES (first_name || ' ' || last_name, phone);
  END LOOP;
END $$;

-- Create sample bookings
DO $$
DECLARE
  customer_id uuid;
  branch_id uuid;
  booking_date date;
  booking_time time;
  guests integer;
  status text;
BEGIN
  FOR i IN 1..50 LOOP
    SELECT id INTO customer_id FROM customers ORDER BY random() LIMIT 1;
    SELECT id INTO branch_id FROM branches ORDER BY random() LIMIT 1;
    
    booking_date := current_date + (floor(random() * 14))::integer;
    booking_time := make_time(
      12 + floor(random() * 10)::integer,
      floor(random() * 4)::integer * 15,
      0
    );
    guests := 1 + floor(random() * 8)::integer;
    status := (ARRAY['pending', 'confirmed', 'cancelled', 'completed'])[1 + floor(random() * 4)];
    
    INSERT INTO bookings (customer_id, branch_id, guests, date, time, status)
    VALUES (customer_id, branch_id, guests, booking_date, booking_time, status);
  END LOOP;
END $$;

-- Create sample queue entries
DO $$
DECLARE
  customer_id uuid;
  branch_id uuid;
  guests integer;
  wait_time integer;
  status text;
BEGIN
  FOR i IN 1..30 LOOP
    SELECT id INTO customer_id FROM customers ORDER BY random() LIMIT 1;
    SELECT id INTO branch_id FROM branches ORDER BY random() LIMIT 1;
    
    guests := 1 + floor(random() * 8)::integer;
    wait_time := 5 + floor(random() * 55)::integer;
    status := (ARRAY['waiting', 'called', 'seated', 'cancelled'])[1 + floor(random() * 4)];
    
    INSERT INTO queue_entries (customer_id, branch_id, guests, wait_time, status)
    VALUES (customer_id, branch_id, guests, wait_time, status);
  END LOOP;
END $$;