/*
  # Add Listing Copy Table

  Creates a table to store AI-generated sales copy for each item across platforms.

  ## Table: listing_copy
  - Stores platform-specific titles and descriptions
  - One record per item
  - Tracks when copy was generated and last updated
*/

-- Create listing_copy table
CREATE TABLE IF NOT EXISTS listing_copy (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  ebay_title text,
  ebay_description text,
  facebook_title text,
  facebook_description text,
  etsy_title text,
  etsy_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE listing_copy ENABLE ROW LEVEL SECURITY;

-- Users can view listing copy for their own items
CREATE POLICY "Users can view listing copy for own items"
  ON listing_copy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listing_copy.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Users can create listing copy for their own items
CREATE POLICY "Users can create listing copy for own items"
  ON listing_copy FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listing_copy.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Users can update listing copy for their own items
CREATE POLICY "Users can update listing copy for own items"
  ON listing_copy FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listing_copy.item_id
      AND items.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listing_copy.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Users can delete listing copy for their own items
CREATE POLICY "Users can delete listing copy for own items"
  ON listing_copy FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listing_copy.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_listing_copy_item_id ON listing_copy(item_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listing_copy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER listing_copy_updated_at
  BEFORE UPDATE ON listing_copy
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_copy_updated_at();
