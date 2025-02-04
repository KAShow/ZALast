-- Add room_number to queue_entries table
ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS room_number integer;