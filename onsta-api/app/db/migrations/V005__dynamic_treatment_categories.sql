-- V005: Dynamic Treatment Categories and Linking

CREATE TABLE IF NOT EXISTS treatment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(60) DEFAULT 'Sparkles',
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed existing categories
INSERT INTO treatment_categories (code, name, description, display_order) VALUES
('FACIAL_SKIN', 'Facial & Skin Health', 'Clinical facials, medical extraction, dermabrasion, and skin hydration therapies', 1),
('LASER_LIGHT', 'Laser & Light Therapy', 'Aesthetic and medical laser treatments, IPL photofacials, and pigment removal', 2),
('SKIN_REJUVENATION', 'Skin Rejuvenation', 'Microneedling, fractional RF, dermal remodeling, and collagen stimulation', 3),
('INJECTABLES', 'Injectables & Neuromodulators', 'Neurotoxin injections (Botox/Dysport) and hyaluronic dermal fillers', 4),
('LIFTING_CONTOURING', 'Lifting & Contouring', 'Non-invasive skin tightening, SMAS ultrasound lifting (HIFU/Ultherapy)', 5),
('REGENERATIVE', 'Regenerative Aesthetics', 'Platelet-rich plasma (PRP), exosome therapy, and polynucleotides', 6)
ON CONFLICT (code) DO NOTHING;

-- Add category_id foreign key to master_treatments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master_treatments' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE master_treatments ADD COLUMN category_id UUID REFERENCES treatment_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update existing master_treatments to point to their category_id based on category name
UPDATE master_treatments mt
SET category_id = tc.id
FROM treatment_categories tc
WHERE LOWER(mt.category) = LOWER(tc.name) OR LOWER(mt.category) LIKE '%' || LOWER(tc.name) || '%';
