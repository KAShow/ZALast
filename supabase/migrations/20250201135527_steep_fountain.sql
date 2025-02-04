/*
  # Clear dummy data

  1. Changes
    - Delete all dummy customers
    - Delete all dummy bookings
    - Delete all dummy queue entries
    - Keep only real branch data
*/

-- Delete all queue entries
DELETE FROM queue_entries;

-- Delete all bookings
DELETE FROM bookings;

-- Delete all customers
DELETE FROM customers;

-- Delete all settings except the default ones
DELETE FROM settings 
WHERE key NOT IN ('restaurant', 'booking', 'notifications');

-- Reset settings to default values
UPDATE settings 
SET value = '{"name": "زاد السلطان", "tables": 20, "openTime": "12:00", "closeTime": "00:00"}'::jsonb 
WHERE key = 'restaurant';

UPDATE settings 
SET value = '{"enabled": true, "maxWaitTime": 30, "maxBookingsPerHour": 10}'::jsonb 
WHERE key = 'booking';

UPDATE settings 
SET value = '{"sms": true, "sound": true, "reminderTime": 15}'::jsonb 
WHERE key = 'notifications';