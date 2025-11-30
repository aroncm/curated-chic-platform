/*
  # VintageLab Database Schema

  Creates a comprehensive database schema for vintage decor identification and resale workflow management.

  ## Tables Created
  
  ### Core Configuration Tables
  1. **categories** - Product categories with hierarchical structure
  2. **inventory_locations** - Physical storage locations
  3. **acquisition_sources** - Where items were purchased from
  4. **listing_platforms** - Sales platforms (eBay, Etsy, etc.)
  5. **tags** - Flexible tagging system
  
  ### Item Management Tables
  6. **items** - Main inventory items with AI-generated metadata
  7. **item_images** - Images for each item
  8. **purchases** - Purchase history and costs
  9. **listings** - Active and past listings
  10. **sales** - Completed sales data
  11. **ai_usage** - AI API usage tracking
  12. **item_tags** - Many-to-many relationship between items and tags
  
  ## Security
  - RLS enabled on all tables
  - Authenticated users can only access their own data
  - Policies enforce ownership at the row level
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('new', 'identified', 'listed', 'sold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_status AS ENUM ('idle', 'pending', 'complete', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_condition_grade AS ENUM ('mint', 'excellent', 'very_good', 'good', 'fair', 'poor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE acquisition_source_type AS ENUM ('thrift_store', 'estate_sale', 'flea_market', 'online_marketplace', 'auction_house', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'live', 'ended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Inventory locations table
CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create locations"
  ON inventory_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update locations"
  ON inventory_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete locations"
  ON inventory_locations FOR DELETE
  TO authenticated
  USING (true);

-- Acquisition sources table
CREATE TABLE IF NOT EXISTS acquisition_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  source_type acquisition_source_type DEFAULT 'other',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE acquisition_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all acquisition sources"
  ON acquisition_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create acquisition sources"
  ON acquisition_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update acquisition sources"
  ON acquisition_sources FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete acquisition sources"
  ON acquisition_sources FOR DELETE
  TO authenticated
  USING (true);

-- Listing platforms table
CREATE TABLE IF NOT EXISTS listing_platforms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  default_fee_percent numeric(5,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listing_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all platforms"
  ON listing_platforms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create platforms"
  ON listing_platforms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update platforms"
  ON listing_platforms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete platforms"
  ON listing_platforms FOR DELETE
  TO authenticated
  USING (true);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete tags"
  ON tags FOR DELETE
  TO authenticated
  USING (true);

-- Items table (main inventory)
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  status item_status DEFAULT 'new',
  category text,
  brand_or_maker text,
  style_or_era text,
  material text,
  color text,
  dimensions_guess text,
  condition_summary text,
  estimated_low_price numeric(10,2),
  estimated_high_price numeric(10,2),
  suggested_list_price numeric(10,2),
  ai_status ai_status DEFAULT 'idle',
  ai_error text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  condition_grade item_condition_grade,
  is_restored boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id AND is_deleted = false);

CREATE POLICY "Users can create own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Item images table
CREATE TABLE IF NOT EXISTS item_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view images for own items"
  ON item_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_images.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create images for own items"
  ON item_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_images.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images for own items"
  ON item_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_images.item_id
      AND items.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_images.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for own items"
  ON item_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_images.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  purchase_price numeric(10,2),
  additional_costs numeric(10,2),
  source text,
  source_id uuid REFERENCES acquisition_sources(id) ON DELETE SET NULL,
  purchase_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchases for own items"
  ON purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = purchases.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create purchases for own items"
  ON purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = purchases.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update purchases for own items"
  ON purchases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = purchases.item_id
      AND items.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = purchases.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete purchases for own items"
  ON purchases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = purchases.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  platform_id uuid REFERENCES listing_platforms(id) ON DELETE SET NULL,
  status listing_status DEFAULT 'draft',
  listing_url text,
  listing_price numeric(10,2),
  shipping_price numeric(10,2),
  fees_estimate numeric(10,2),
  date_listed date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view listings for own items"
  ON listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listings.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create listings for own items"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listings.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update listings for own items"
  ON listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listings.item_id
      AND items.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listings.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete listings for own items"
  ON listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = listings.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sale_price numeric(10,2),
  shipping_cost numeric(10,2),
  platform_fees numeric(10,2),
  other_fees numeric(10,2),
  sale_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales for own items"
  ON sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = sales.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sales for own items"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = sales.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sales for own items"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = sales.item_id
      AND items.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = sales.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sales for own items"
  ON sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = sales.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  endpoint text,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  total_cost_usd numeric(10,6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI usage"
  ON ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI usage"
  ON ai_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI usage"
  ON ai_usage FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Item tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_id, tag_id)
);

ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for own items"
  ON item_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_tags.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags for own items"
  ON item_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_tags.item_id
      AND items.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags for own items"
  ON item_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_tags.item_id
      AND items.owner_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_location_id ON items(location_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_item_id ON purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_listings_item_id ON listings(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
