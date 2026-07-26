-- ====================================================================
-- THE LOOP: Multi-Product Architecture (Flipkart-Scale) - Full Schema
-- ====================================================================

-- Create ENUMs
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- 1. Enhanced Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Stored in paise (₹100 = 10000)
    stock INTEGER NOT NULL DEFAULT 100,
    stock_quantity INTEGER DEFAULT 100,
    images TEXT[] DEFAULT '{}',
    image_url TEXT, -- Primary display image for UI performance
    is_active BOOLEAN DEFAULT true,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    tags TEXT[] DEFAULT '{}',
    discount_percent INTEGER DEFAULT 0,
    rating NUMERIC(2,1) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance (The Loop Optimization)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 2. New Table: Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. New Table: Cart (Session-based)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL, -- For non-logged in users
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(session_id, product_id)
);

-- 4. Enhanced Orders Table (Supports Single & Multi-product Checkout)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    email TEXT,
    customer_email TEXT, -- Alias / explicit email field for checkout workflow
    customer_name TEXT NOT NULL,
    full_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    product_id UUID REFERENCES products(id), -- Optional for backwards compatibility
    product_name TEXT, -- Optional for backwards compatibility
    items JSONB DEFAULT '[]'::jsonb, -- Array of cart items stored as JSON
    cod_amount INTEGER NOT NULL, -- Total amount in paise
    status order_status DEFAULT 'pending',
    phone_verified BOOLEAN DEFAULT false,
    verification_method TEXT DEFAULT 'Email',
    device_fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT,
    email TEXT,
    order_id UUID REFERENCES orders(id),
    otp_hash TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Full Text Search Materialized View (Advanced Discovery)
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

-- 7. Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- 8. Policies
-- Products & Categories Policies
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage all products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Cart Items Policies (Session-based public access)
CREATE POLICY "Public cart items access" ON cart_items FOR ALL USING (true) WITH CHECK (true);

-- Orders Policies
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can manage orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view their orders by phone" ON orders FOR SELECT USING (true);

-- OTP Verifications Policies
CREATE POLICY "Service role can manage OTPs" ON otp_verifications FOR ALL USING (true);

-- 9. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE otp_verifications;

-- 10. Create Storage Bucket for Products
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- 11. Sample Flipkart-Scale Catalog Data
INSERT INTO products (name, price, category, brand, description, is_active, discount_percent, rating, review_count, image_url, images) VALUES
('iPhone 15 Pro (128GB, Natural Titanium)', 12990000, 'electronics', 'Apple', 'Forged in titanium with an A17 Pro chip, completely customizable Action button and versatile Pro camera system.', true, 8, 4.9, 1420, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800']),
('Nike Air Max Pulse Mens Running Shoes', 899900, 'fashion', 'Nike', 'Drawing inspiration from the London music scene, bringing an underground touch to the iconic Air Max lineup.', true, 15, 4.7, 512, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800']),
('Sony WH-1000XM5 Wireless Headphones', 2999000, 'electronics', 'Sony', 'Industry-leading noise cancellation with two processors and 8 microphones for unprecedented sound quality.', true, 12, 4.8, 890, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800']),
('MacBook Air 13-inch (M3 Chip, 8GB, 256GB)', 11490000, 'electronics', 'Apple', 'Super lightweight and nearly half an inch thin with all-day battery life and Liquid Retina display.', true, 5, 4.9, 740, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800']),
('Dyson V15 Detect Cordless Vacuum Cleaner', 5590000, 'home', 'Dyson', 'Intelligent cordless vacuum with laser illumination to reveal microscopic dust and hygienic bin emptying.', true, 10, 4.6, 320, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800']),
('Estée Lauder Advanced Night Repair Serum', 850000, 'beauty', 'Estée Lauder', 'Deep- and fast-penetrating face serum that reduces multiple signs of aging for a smoother, younger-looking radiance.', true, 0, 4.8, 620, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800'])
ON CONFLICT DO NOTHING;
