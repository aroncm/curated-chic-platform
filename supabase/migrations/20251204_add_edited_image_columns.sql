-- Add columns for edited images using Gemini AI
ALTER TABLE item_images
ADD COLUMN IF NOT EXISTS edited_url TEXT,
ADD COLUMN IF NOT EXISTS edit_prompt TEXT,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add index on edited_url for faster queries
CREATE INDEX IF NOT EXISTS idx_item_images_edited_url ON item_images(edited_url) WHERE edited_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN item_images.edited_url IS 'URL of the edited version of the image (e.g., background removed, color corrected)';
COMMENT ON COLUMN item_images.edit_prompt IS 'The prompt used to generate the edited image';
COMMENT ON COLUMN item_images.edited_at IS 'Timestamp when the image was edited';
