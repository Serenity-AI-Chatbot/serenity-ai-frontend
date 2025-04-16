-- Add is_processing column to journals table
ALTER TABLE journals 
ADD COLUMN is_processing BOOLEAN DEFAULT FALSE;

-- Add location column to journals table
ALTER TABLE journals
ADD COLUMN location TEXT;

-- Update existing journals to ensure they're not marked as processing
UPDATE journals
SET is_processing = FALSE
WHERE is_processing IS NULL;

-- Add an index to improve query performance when filtering by processing status
CREATE INDEX idx_journals_is_processing ON journals(is_processing);

-- Grant permissions
GRANT ALL ON TABLE journals TO authenticated;
GRANT ALL ON TABLE journals TO service_role; 