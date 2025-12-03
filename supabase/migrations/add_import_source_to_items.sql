-- Add import_source column to items table
-- This tracks how the item was created (manual upload vs email/Zapier)

ALTER TABLE items
ADD COLUMN import_source TEXT DEFAULT 'manual' CHECK (import_source IN ('manual', 'email'));

-- Add comment for documentation
COMMENT ON COLUMN items.import_source IS 'Source of item creation: manual (web upload) or email (Zapier ingestion)';

-- Update existing items to have 'manual' as source
UPDATE items
SET import_source = 'manual'
WHERE import_source IS NULL;

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_items_import_source ON items(import_source);
