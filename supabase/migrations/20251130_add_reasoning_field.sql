-- Add reasoning field to items table to store AI's detailed explanation
-- of identification and pricing decisions

ALTER TABLE items ADD COLUMN IF NOT EXISTS reasoning TEXT NULL;

COMMENT ON COLUMN items.reasoning IS 'AI-generated explanation of identification and pricing decisions (3-5 paragraphs with detailed rationale)';
