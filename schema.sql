-- ============================================
-- LO QUIERO! - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,                    -- SVG path or icon name
  color TEXT DEFAULT '#E85002',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),  -- tachado / precio original
  category_id UUID REFERENCES categories(id),
  images TEXT[] DEFAULT '{}',   -- array of URLs
  variants JSONB DEFAULT '[]',  -- [{name:'Color', options:['Rojo','Azul']}]
  stock INTEGER DEFAULT 1,      -- -1 = ilimitado
  is_new BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  discount_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAROUSELS / BANNERS
-- ============================================
CREATE TABLE carousels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link_type TEXT DEFAULT 'category', -- 'category' | 'product' | 'url'
  link_value TEXT,
  bg_color TEXT DEFAULT '#E85002',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTIONS (bloques en el home)
-- ============================================
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'grid', -- 'grid' | 'carousel' | 'featured' | 'banner'
  filter_type TEXT,          -- 'category' | 'tag' | 'featured' | 'new' | 'manual'
  filter_value TEXT,
  product_ids UUID[] DEFAULT '{}', -- para tipo manual
  columns INTEGER DEFAULT 4,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS (barra superior)
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  bg_color TEXT DEFAULT '#E85002',
  text_color TEXT DEFAULT '#FFFFFF',
  link_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISCOUNT CODES
-- ============================================
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'percent',   -- 'percent' | 'fixed'
  value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT -1,   -- -1 = ilimitado
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS (pedidos enviados por WhatsApp)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number SERIAL,
  items JSONB NOT NULL,          -- [{product_id, name, price, qty, variant}]
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_code TEXT,
  total DECIMAL(10,2),
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMMENTS (mensajes privados a Carina)
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  message TEXT NOT NULL,
  sent_to_wa BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE CONFIG
-- ============================================
CREATE TABLE site_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_config (key, value) VALUES
  ('wa_number', '5493445440326'),
  ('instagram', 'loquiero.tienda'),
  ('site_name', 'LO QUIERO!'),
  ('accent_color', '#E85002'),
  ('free_shipping_min', '0'),
  ('show_cart', 'true'),
  ('show_favorites', 'true');

-- ============================================
-- ROW LEVEL SECURITY (público lee, solo admin escribe)
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (solo lectura en tablas visibles)
CREATE POLICY "public_read_products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_categories" ON categories FOR SELECT USING (active = true);
CREATE POLICY "public_read_carousels" ON carousels FOR SELECT USING (active = true);
CREATE POLICY "public_read_sections" ON sections FOR SELECT USING (active = true);
CREATE POLICY "public_read_announcements" ON announcements FOR SELECT USING (active = true);
CREATE POLICY "public_read_config" ON site_config FOR SELECT USING (true);

-- Orders se pueden insertar sin auth (el cliente genera el pedido)
CREATE POLICY "public_insert_orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_comments" ON comments FOR INSERT WITH CHECK (true);

-- Discount codes: solo validar por código (lectura filtrada)
CREATE POLICY "public_read_discount_codes" ON discount_codes FOR SELECT USING (active = true);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Tecnología', 'tecnologia', 'cpu', 1),
  ('Hogar', 'hogar', 'home', 2),
  ('Cocina', 'cocina', 'utensils', 3),
  ('Blanquería', 'blanqueria', 'layers', 4),
  ('Vestimenta', 'vestimenta', 'shirt', 5),
  ('Baño', 'bano', 'droplets', 6),
  ('Juguetes', 'juguetes', 'star', 7),
  ('Accesorios', 'accesorios', 'tag', 8);
