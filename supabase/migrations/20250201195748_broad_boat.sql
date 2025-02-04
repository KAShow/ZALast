-- Update the valid_status constraint for queue_entries table
ALTER TABLE queue_entries 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE queue_entries
ADD CONSTRAINT valid_status 
CHECK (status IN ('waiting', 'called', 'seated', 'cancelled', 'completed'));