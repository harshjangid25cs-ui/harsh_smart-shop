-- ====================================================================
-- MIGRATION: 20260726_multi_product_loop.sql
-- Evolution from Single-Product Store → Multi-Product Marketplace
-- ====================================================================

-- 1. Enhanced Products Table (Keep existing, add columns)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 100;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 4.5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

-- Create indexes for performance (The Loop Optimization)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 2. New Table: Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES categories(id),
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- 3. New Table: Cart (Session-based)
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL, -- For non-logged users
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  added_at timestamptz DEFAULT now(),
  UNIQUE(session_id, product_id)
);

-- 4. Full Text Search Materialized View (Advanced)
DROP MATERIALIZED VIEW IF EXISTS product_search_view;
CREATE MATERIALIZED VIEW product_search_view AS
SELECT 
  id,
  name,
  description,
  price,
  category,
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(description, '') || ' ' || 
    coalesce(category, '')
  ) as search_vector
FROM products 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_search ON product_search_view USING gin(search_vector);

-- 5. Update Orders Table for Multi-Product Checkout Support
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN product_name DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN verification_method SET DEFAULT 'Email';

-- 6. Enable RLS and create security policies for new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public cart items access" ON cart_items FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Insert Sample Products Catalog (With Real Images & Metadata)
INSERT INTO products (name, price, category, brand, description, is_active, discount_percent, rating, review_count, image_url, images) VALUES
('iPhone 15 Pro (128GB, Natural Titanium)', 12990000, 'electronics', 'Apple', 'Forged in titanium with an A17 Pro chip, completely customizable Action button and versatile Pro camera system.', true, 8, 4.9, 1420, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800']),
('Nike Air Max Pulse Mens Running Shoes', 899900, 'fashion', 'Nike', 'Drawing inspiration from the London music scene, bringing an underground touch to the iconic Air Max lineup.', true, 15, 4.7, 512, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800']),
('Sony WH-1000XM5 Wireless Headphones', 2999000, 'electronics', 'Sony', 'Industry-leading noise cancellation with two processors and 8 microphones for unprecedented sound quality.', true, 12, 4.8, 890, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800']),
('MacBook Air 13-inch (M3 Chip, 8GB, 256GB)', 11490000, 'electronics', 'Apple', 'Super lightweight and nearly half an inch thin with all-day battery life and Liquid Retina display.', true, 5, 4.9, 740, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800']),
('Dyson V15 Detect Cordless Vacuum Cleaner', 5590000, 'home', 'Dyson', 'Intelligent cordless vacuum with laser illumination to reveal microscopic dust and hygienic bin emptying.', true, 10, 4.6, 320, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800']),
('Estée Lauder Advanced Night Repair Serum', 850000, 'beauty', 'Estée Lauder', 'Deep- and fast-penetrating face serum that reduces multiple signs of aging for a smoother, younger-looking radiance.', true, 0, 4.8, 620, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800'])
ON CONFLICT DO NOTHING;
