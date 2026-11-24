-- V004: Master Treatments, Target Concerns, and AI Mapping Taxonomy

CREATE TABLE IF NOT EXISTS target_concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'SKIN',
    description TEXT,
    severity_levels JSONB DEFAULT '["MILD", "MODERATE", "SEVERE"]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) UNIQUE NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    medical_specialty VARCHAR(80),
    standard_duration_minutes INT DEFAULT 45,
    reference_price_min NUMERIC(10,2),
    reference_price_max NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treatment_concern_mappings (
    treatment_id UUID NOT NULL REFERENCES master_treatments(id) ON DELETE CASCADE,
    concern_id UUID NOT NULL REFERENCES target_concerns(id) ON DELETE CASCADE,
    efficacy_score INT DEFAULT 5,
    PRIMARY KEY(treatment_id, concern_id)
);

-- Add master_treatment_id to clinic services table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'master_treatment_id'
    ) THEN
        ALTER TABLE services ADD COLUMN master_treatment_id UUID REFERENCES master_treatments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Seed Standard Target Concerns (Detectable by Onsta AI/Face Scan)
INSERT INTO target_concerns (code, name, category, description) VALUES
('ACNE_ACTIVE', 'Active Acne & Breakouts', 'SKIN', 'Inflammatory papules, pustules, and comedones across facial zones'),
('CLOGGED_PORES', 'Clogged Pores & Blackheads', 'SKIN', 'Sebaceous filaments and congested pores in T-zone'),
('HYPERPIGMENTATION', 'Hyperpigmentation & Sun Spots', 'SKIN', 'UV-induced melanin accumulation and solar lentigines'),
('MELASMA', 'Melasma & Hormonal Pigment', 'SKIN', 'Bilateral patchy facial pigmentation common on cheeks and forehead'),
('ACNE_SCARRING', 'Acne Scars & Texture', 'SKIN', 'Atrophic scars, ice-pick indentations, and post-acne textural damage'),
('FINE_LINES', 'Fine Lines & Early Wrinkles', 'ANTI_AGING', 'Superficial periorbital and perioral dynamic lines'),
('DEEP_WRINKLES', 'Expression & Dynamic Wrinkles', 'ANTI_AGING', 'Glabellar frown lines, forehead horizontal lines, crow''s feet'),
('SKIN_LAXITY', 'Skin Laxity & Jowl Sagging', 'ANTI_AGING', 'Loss of dermal elastin and collagen resulting in lower face sagging'),
('VOLUME_LOSS', 'Mid-Face Volume Deficit', 'ANTI_AGING', 'Hollowing in tear troughs, cheek flattening, and nasolabial deepening'),
('DULL_COMPLEXION', 'Dullness & Dehydration', 'SKIN', 'Transepidermal water loss and impaired epidermal barrier function')
ON CONFLICT (code) DO NOTHING;

-- Seed Standard Master Clinical Treatments
INSERT INTO master_treatments (name, category, description, medical_specialty, standard_duration_minutes, reference_price_min, reference_price_max) VALUES
('Hydrafacial / Hydro-Dermabrasion', 'Facial & Skin Health', 'Vortex-suction deep cleansing, gentle acid exfoliation, and antioxidant serum infusion', 'Aesthetic Medicine', 45, 350.00, 750.00),
('Chemical Peel (Salicylic / Glycolic / TCA)', 'Facial & Skin Health', 'Controlled chemical exfoliation promoting cell turnover and clear pores', 'Dermatology', 30, 300.00, 650.00),
('Pico Laser / Q-Switched Nd:YAG', 'Laser & Light Therapy', 'Ultra-short picosecond pulses shattering melanin pigment and sun spots without thermal skin damage', 'Dermatology', 45, 600.00, 1500.00),
('RF Microneedling (Morpheus8 / Potenza)', 'Skin Rejuvenation', 'Fractional radiofrequency delivering heat deep into dermis to remodel collagen and tighten scars', 'Dermatology', 60, 900.00, 2500.00),
('Botulinum Toxin (Botox / Dysport)', 'Injectables & Neuromodulators', 'Targeted neurotoxin injections relaxing hyperactive dynamic facial muscles', 'Aesthetic Medicine', 30, 700.00, 1800.00),
('Hyaluronic Acid Dermal Fillers', 'Injectables & Neuromodulators', 'Cross-linked hyaluronic gel restoring lost volume, contouring lips, cheeks, and jawline', 'Aesthetic Medicine', 45, 1200.00, 3200.00),
('HIFU / Ultherapy Non-Surgical Facelift', 'Lifting & Contouring', 'Micro-focused ultrasound energy targeting the SMAS layer for non-invasive skin lifting', 'Aesthetic Medicine', 60, 1500.00, 4500.00),
('IPL Photofacial (Lumecca / Stellar M22)', 'Laser & Light Therapy', 'Intense pulsed light targeting vascular erythema, broken capillaries, and diffuse redness', 'Dermatology', 40, 450.00, 950.00)
ON CONFLICT (name) DO NOTHING;

-- Map Master Treatments to Target Concerns
INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'Hydrafacial / Hydro-Dermabrasion' 
  AND c.code IN ('CLOGGED_PORES', 'DULL_COMPLEXION', 'ACNE_ACTIVE')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'Chemical Peel (Salicylic / Glycolic / TCA)' 
  AND c.code IN ('ACNE_ACTIVE', 'ACNE_SCARRING', 'HYPERPIGMENTATION')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'Pico Laser / Q-Switched Nd:YAG' 
  AND c.code IN ('HYPERPIGMENTATION', 'MELASMA', 'ACNE_SCARRING')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'RF Microneedling (Morpheus8 / Potenza)' 
  AND c.code IN ('ACNE_SCARRING', 'FINE_LINES', 'SKIN_LAXITY')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'Botulinum Toxin (Botox / Dysport)' 
  AND c.code IN ('FINE_LINES', 'DEEP_WRINKLES')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'Hyaluronic Acid Dermal Fillers' 
  AND c.code IN ('VOLUME_LOSS', 'DEEP_WRINKLES')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;

INSERT INTO treatment_concern_mappings (treatment_id, concern_id, efficacy_score)
SELECT t.id, c.id, 5
FROM master_treatments t, target_concerns c
WHERE t.name = 'HIFU / Ultherapy Non-Surgical Facelift' 
  AND c.code IN ('SKIN_LAXITY', 'FINE_LINES')
ON CONFLICT (treatment_id, concern_id) DO NOTHING;
