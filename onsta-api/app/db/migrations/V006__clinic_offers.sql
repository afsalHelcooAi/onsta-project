-- V006: Dedicated Clinic Offers Table and Storage

CREATE TABLE IF NOT EXISTS clinic_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    normal_price NUMERIC(10,2) NOT NULL CHECK (normal_price >= 0),
    offer_price NUMERIC(10,2) NOT NULL CHECK (offer_price >= 0),
    discount_percentage INTEGER GENERATED ALWAYS AS (
        CASE WHEN normal_price > 0 AND offer_price < normal_price 
             THEN ROUND(((normal_price - offer_price) / normal_price) * 100)::INTEGER
             ELSE 0 
        END
    ) STORED,
    currency CHAR(3) NOT NULL DEFAULT 'AED',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    terms_and_conditions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clinic_offers_clinic ON clinic_offers(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_offers_service ON clinic_offers(service_id);
