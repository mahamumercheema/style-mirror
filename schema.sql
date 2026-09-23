-- ============================================================================
-- Phase 2: Closet & Wardrobe Management Engine
-- Database Schema (PostgreSQL / Supabase compatible)
-- ============================================================================

-- Enable pgcrypto / uuid extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Table Definitions
-- ============================================================================

-- Table A: users (User Account & Profile)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    user_photo_url TEXT,
    body_type_notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table B: categories (Item Classifications)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table C: occasions (Event / Formality Tags)
CREATE TABLE IF NOT EXISTS occasions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table D: wardrobe_items (Individual Clothing & Accessory Records)
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(150),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    fabric_type VARCHAR(50),
    season VARCHAR(30),
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table E: item_occasions (Junction Table for Many-to-Many Relationship)
CREATE TABLE IF NOT EXISTS item_occasions (
    item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    occasion_id INTEGER NOT NULL REFERENCES occasions(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, occasion_id)
);

-- ============================================================================
-- 2. Indexes & Performance Optimization
-- ============================================================================

-- Required indexes for fast query execution
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id 
    ON wardrobe_items(user_id);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category_id 
    ON wardrobe_items(category_id);

CREATE INDEX IF NOT EXISTS idx_item_occasions_occasion_item 
    ON item_occasions(occasion_id, item_id);

-- Additional composite and filtering indexes for AI curation
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_favorite 
    ON wardrobe_items(user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_season 
    ON wardrobe_items(user_id, season);

CREATE INDEX IF NOT EXISTS idx_categories_parent_type 
    ON categories(parent_type);

-- ============================================================================
-- 3. Automatic updated_at Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_wardrobe_items_updated_at ON wardrobe_items;
CREATE TRIGGER set_wardrobe_items_updated_at
    BEFORE UPDATE ON wardrobe_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Row Level Security (RLS) & Security Policies
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;

-- Categories & Occasions: Public / Read-Only for all authenticated & anon users
DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
CREATE POLICY "Allow public read access to categories"
    ON categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public read access to occasions" ON occasions;
CREATE POLICY "Allow public read access to occasions"
    ON occasions FOR SELECT
    USING (true);

-- Users: Users can view and update only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Wardrobe Items: Full CRUD scoped strictly to item owner
DROP POLICY IF EXISTS "Users can select own wardrobe items" ON wardrobe_items;
CREATE POLICY "Users can select own wardrobe items"
    ON wardrobe_items FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wardrobe items" ON wardrobe_items;
CREATE POLICY "Users can insert own wardrobe items"
    ON wardrobe_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wardrobe items" ON wardrobe_items;
CREATE POLICY "Users can update own wardrobe items"
    ON wardrobe_items FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wardrobe items" ON wardrobe_items;
CREATE POLICY "Users can delete own wardrobe items"
    ON wardrobe_items FOR DELETE
    USING (auth.uid() = user_id);

-- Item Occasions: Scoped to wardrobe items owned by the user
DROP POLICY IF EXISTS "Users can select occasions for own items" ON item_occasions;
CREATE POLICY "Users can select occasions for own items"
    ON item_occasions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wardrobe_items wi
            WHERE wi.id = item_occasions.item_id
              AND wi.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert occasions for own items" ON item_occasions;
CREATE POLICY "Users can insert occasions for own items"
    ON item_occasions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wardrobe_items wi
            WHERE wi.id = item_occasions.item_id
              AND wi.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete occasions for own items" ON item_occasions;
CREATE POLICY "Users can delete occasions for own items"
    ON item_occasions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM wardrobe_items wi
            WHERE wi.id = item_occasions.item_id
              AND wi.user_id = auth.uid()
        )
    );
