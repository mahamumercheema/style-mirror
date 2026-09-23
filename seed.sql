-- ============================================================================
-- Phase 2: Closet & Wardrobe Management Engine
-- Initial Data Seeding Script (SQL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Seed Categories (Diverse Western & Traditional Ethnic Fashion)
-- ----------------------------------------------------------------------------

INSERT INTO categories (name, parent_type) VALUES
    -- Tops
    ('Shirt', 'Tops'),
    ('T-Shirt', 'Tops'),
    ('Blouse', 'Tops'),
    ('Kurti / Kurta', 'Tops'),
    ('Sweater / Cardigan', 'Tops'),
    ('Blazer / Jacket', 'Tops'),
    ('Crop Top', 'Tops'),
    ('Hoodie / Sweatshirt', 'Tops'),

    -- Bottoms
    ('Pants / Trousers', 'Bottoms'),
    ('Jeans / Denim', 'Bottoms'),
    ('Skirts', 'Bottoms'),
    ('Shalwar', 'Bottoms'),
    ('Gharara Bottoms / Sharara', 'Bottoms'),
    ('Palazzo / Culottes', 'Bottoms'),
    ('Churidar / Leggings', 'Bottoms'),
    ('Shorts', 'Bottoms'),

    -- Full Body / Ethnic Set
    ('Shalwar Kameez (2pc / 3pc Set)', 'Full Body / Ethnic Set'),
    ('Gharara Suit', 'Full Body / Ethnic Set'),
    ('Frock / Anarkali', 'Full Body / Ethnic Set'),
    ('Maxi / Evening Gown', 'Full Body / Ethnic Set'),
    ('Western Dress', 'Full Body / Ethnic Set'),
    ('Jumpsuit / Romper', 'Full Body / Ethnic Set'),
    ('Saree', 'Full Body / Ethnic Set'),
    ('Lehenga Choli', 'Full Body / Ethnic Set'),
    ('Formal Suit / Tuxedo', 'Full Body / Ethnic Set'),

    -- Footwear
    ('Joggers / Sneakers', 'Footwear'),
    ('Heels / Pumps', 'Footwear'),
    ('Flats / Sandals', 'Footwear'),
    ('Khussas / Mojaris', 'Footwear'),
    ('Formal Shoes / Oxfords / Loafers', 'Footwear'),
    ('Boots / Ankle Boots', 'Footwear'),
    ('Slides / Slippers', 'Footwear'),

    -- Accessories & Jewelry
    ('Earrings / Jhumkas', 'Accessories'),
    ('Necklace / Mala / Choker', 'Accessories'),
    ('Rings', 'Accessories'),
    ('Bangles / Bracelets / Kadas', 'Accessories'),
    ('Handbags / Clutches / Potli Bags', 'Accessories'),
    ('Belts', 'Accessories'),
    ('Dupattas / Stoles / Shawls', 'Accessories'),
    ('Sunglasses', 'Accessories'),
    ('Watches', 'Accessories'),
    ('Hats / Caps', 'Accessories')
ON CONFLICT (name) DO UPDATE
SET parent_type = EXCLUDED.parent_type;

-- ----------------------------------------------------------------------------
-- 2. Seed Occasions (Event / Formality Tags)
-- ----------------------------------------------------------------------------

INSERT INTO occasions (name) VALUES
    ('Office / Work'),
    ('Casual / Daily'),
    ('Dinner / Party'),
    ('Wedding / Festive / Fancy'),
    ('Formal'),
    ('Party / Night Out'),
    ('Traditional / Religious'),
    ('Athletic / Gym')
ON CONFLICT (name) DO NOTHING;
