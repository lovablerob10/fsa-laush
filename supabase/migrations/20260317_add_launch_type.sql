-- Add launch_type column to launches table
ALTER TABLE launches ADD COLUMN IF NOT EXISTS launch_type text DEFAULT 'aceleracao';
